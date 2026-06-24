const { withAndroidManifest, withDangerousMod, withMainApplication } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const ANDROID_PERMISSIONS = [
  "android.permission.RECORD_AUDIO",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_MICROPHONE"
];

function getPackageName(config) {
  return config.android?.package ?? "com.mysleepdream.app";
}

function packagePath(packageName) {
  return packageName.split(".").join(path.sep);
}

function ensurePermission(manifest, permission) {
  manifest["uses-permission"] = manifest["uses-permission"] ?? [];
  const exists = manifest["uses-permission"].some(
    (item) => item.$?.["android:name"] === permission
  );

  if (!exists) {
    manifest["uses-permission"].push({ $: { "android:name": permission } });
  }
}

function withSleepAudioManifest(config) {
  return withAndroidManifest(config, (nextConfig) => {
    const manifest = nextConfig.modResults.manifest;
    ANDROID_PERMISSIONS.forEach((permission) => ensurePermission(manifest, permission));

    const packageName = getPackageName(nextConfig);
    const application = manifest.application?.[0];
    if (application) {
      application.service = application.service ?? [];
      const serviceName = `${packageName}.sleepaudio.SleepAudioForegroundService`;
      const exists = application.service.some((service) => service.$?.["android:name"] === serviceName);

      if (!exists) {
        application.service.push({
          $: {
            "android:name": serviceName,
            "android:exported": "false",
            "android:foregroundServiceType": "microphone"
          }
        });
      }
    }

    return nextConfig;
  });
}

function addKotlinPackage(contents, packageName) {
  const importLine = `import ${packageName}.sleepaudio.SleepAudioMonitoringPackage`;
  let next = contents.includes(importLine)
    ? contents
    : contents.replace(/^(package .+\n)/m, `$1\n${importLine}\n`);

  if (next.includes("SleepAudioMonitoringPackage()")) {
    return next;
  }

  if (next.includes("val packages = PackageList(this).packages")) {
    return next.replace(
      /(\s+val packages = PackageList\(this\).packages\n)/,
      `$1      packages.add(SleepAudioMonitoringPackage())\n`
    );
  }

  if (next.includes("return PackageList(this).packages.apply {")) {
    return next.replace(
      /(return PackageList\(this\).packages.apply \{\n)/,
      `$1        add(SleepAudioMonitoringPackage())\n`
    );
  }

  return next;
}

function addJavaPackage(contents, packageName) {
  const importLine = `import ${packageName}.sleepaudio.SleepAudioMonitoringPackage;`;
  let next = contents.includes(importLine)
    ? contents
    : contents.replace(/^(package .+;\n)/m, `$1\n${importLine}\n`);

  if (next.includes("new SleepAudioMonitoringPackage()")) {
    return next;
  }

  return next.replace(
    /(\s+List<ReactPackage> packages = new PackageList\(this\).getPackages\(\);\n)/,
    `$1    packages.add(new SleepAudioMonitoringPackage());\n`
  );
}

function withSleepAudioMainApplication(config) {
  return withMainApplication(config, (nextConfig) => {
    const packageName = getPackageName(nextConfig);
    const language = nextConfig.modResults.language;
    nextConfig.modResults.contents = language === "kt"
      ? addKotlinPackage(nextConfig.modResults.contents, packageName)
      : addJavaPackage(nextConfig.modResults.contents, packageName);
    return nextConfig;
  });
}

function writeSourceFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function withSleepAudioSources(config) {
  return withDangerousMod(config, [
    "android",
    async (nextConfig) => {
      const packageName = getPackageName(nextConfig);
      const sourceRoot = path.join(
        nextConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath(packageName),
        "sleepaudio"
      );

      writeSourceFile(
        path.join(sourceRoot, "SleepAudioMonitoringPackage.java"),
        createPackageSource(packageName)
      );
      writeSourceFile(
        path.join(sourceRoot, "SleepAudioMonitoringModule.java"),
        createModuleSource(packageName)
      );
      writeSourceFile(
        path.join(sourceRoot, "SleepAudioForegroundService.java"),
        createServiceSource(packageName)
      );

      return nextConfig;
    }
  ]);
}

function createPackageSource(packageName) {
  return `package ${packageName}.sleepaudio;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SleepAudioMonitoringPackage implements ReactPackage {
  @Override
  public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new SleepAudioMonitoringModule(reactContext));
    return modules;
  }

  @Override
  public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
    return Collections.emptyList();
  }
}
`;
}

function createModuleSource(packageName) {
  return `package ${packageName}.sleepaudio;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Comparator;
import org.json.JSONArray;
import org.json.JSONObject;

public class SleepAudioMonitoringModule extends ReactContextBaseJavaModule {
  public SleepAudioMonitoringModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "SleepAudioMonitoring";
  }

  @ReactMethod
  public void startSleepMonitoring(ReadableMap input, Promise promise) {
    try {
      String date = input.hasKey("date") ? input.getString("date") : "";
      String sessionId = input.hasKey("sessionId") ? input.getString("sessionId") : "";
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, SleepAudioForegroundService.class);
      intent.setAction(SleepAudioForegroundService.ACTION_START);
      intent.putExtra(SleepAudioForegroundService.EXTRA_DATE, date);
      intent.putExtra(SleepAudioForegroundService.EXTRA_SESSION_ID, sessionId);

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent);
      } else {
        context.startService(intent);
      }

      Thread.sleep(120);
      promise.resolve(statusMap(context, date, true, sessionId, null));
    } catch (Exception error) {
      promise.reject("sleep_audio_start_failed", error);
    }
  }

  @ReactMethod
  public void stopSleepMonitoring(ReadableMap input, Promise promise) {
    try {
      String date = input.hasKey("date") ? input.getString("date") : "";
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, SleepAudioForegroundService.class);
      intent.setAction(SleepAudioForegroundService.ACTION_STOP);
      intent.putExtra(SleepAudioForegroundService.EXTRA_DATE, date);
      context.startService(intent);
      waitForStoppedStatus(context, date, 4500);
      promise.resolve(statusMap(context, date, false, null, null));
    } catch (Exception error) {
      promise.reject("sleep_audio_stop_failed", error);
    }
  }

  @ReactMethod
  public void getSleepMonitoringStatus(Promise promise) {
    try {
      promise.resolve(statusMap(getReactApplicationContext(), null, SleepAudioForegroundService.isRunning(), null, null));
    } catch (Exception error) {
      promise.reject("sleep_audio_status_failed", error);
    }
  }

  @ReactMethod
  public void getSleepMonitoringStatusForDate(ReadableMap input, Promise promise) {
    try {
      String date = input.hasKey("date") ? input.getString("date") : "";
      promise.resolve(statusMap(getReactApplicationContext(), date, SleepAudioForegroundService.isRunning(), null, null));
    } catch (Exception error) {
      promise.reject("sleep_audio_status_failed", error);
    }
  }

  @ReactMethod
  public void deleteSleepMonitoringSession(ReadableMap input, Promise promise) {
    try {
      String date = input.hasKey("date") ? input.getString("date") : "";
      Context context = getReactApplicationContext();
      Intent intent = new Intent(context, SleepAudioForegroundService.class);
      intent.setAction(SleepAudioForegroundService.ACTION_STOP);
      intent.putExtra(SleepAudioForegroundService.EXTRA_DATE, date);
      context.startService(intent);
      waitForStoppedStatus(context, date, 4500);
      deleteSessionFiles(context, date);
      promise.resolve(null);
    } catch (Exception error) {
      promise.reject("sleep_audio_delete_failed", error);
    }
  }

  private WritableMap statusMap(Context context, String date, boolean fallbackRunning, String sessionId, String lastError) throws Exception {
    JSONObject status = readStatus(context, date);
    String resolvedDate = status.optString("date", date);
    String resolvedSessionId = status.optString("sessionId", sessionId);
    JSONArray events = status.optJSONArray("events");
    if ((events == null || events.length() == 0) && resolvedDate != null && resolvedDate.length() > 0) {
      events = clipsFromDirectory(context, resolvedDate, resolvedSessionId);
    }
    WritableMap map = Arguments.createMap();
    map.putBoolean("isRunning", status.optBoolean("isRunning", fallbackRunning));
    map.putString("sessionId", resolvedSessionId);
    map.putString("date", resolvedDate);
    map.putString("startedAt", status.optString("startedAt", null));
    map.putString("stoppedAt", status.optString("stoppedAt", null));
    map.putInt("eventCount", Math.max(status.optInt("eventCount", 0), events == null ? 0 : events.length()));
    String localAudioUri = status.optString("localAudioUri", null);
    if ((localAudioUri == null || localAudioUri.length() == 0) && resolvedDate != null && resolvedDate.length() > 0) {
      localAudioUri = previewClipFromDirectory(context, resolvedDate);
    }
    if (localAudioUri != null && localAudioUri.length() > 0) {
      map.putString("localAudioUri", localAudioUri);
    }
    if (lastError != null) {
      map.putString("lastError", lastError);
    } else if (status.has("lastError")) {
      map.putString("lastError", status.optString("lastError", null));
    }
    map.putArray("events", jsonArrayToWritable(events));
    JSONObject summary = status.optJSONObject("summary");
    if (summary != null) {
      map.putMap("summary", jsonObjectToWritable(summary));
    }
    return map;
  }

  private void waitForStoppedStatus(Context context, String date, long maxWaitMs) throws Exception {
    long deadline = System.currentTimeMillis() + maxWaitMs;
    while (System.currentTimeMillis() < deadline) {
      try {
        JSONObject status = readStatus(context, date);
        if (status.has("isRunning") && !status.optBoolean("isRunning", true)) {
          return;
        }
      } catch (Exception ignored) {}
      Thread.sleep(120);
    }
  }

  private JSONObject readStatus(Context context, String date) throws Exception {
    File file = statusFile(context, date);
    if (!file.exists()) {
      return new JSONObject();
    }
    return new JSONObject(readFile(file));
  }

  private File statusFile(Context context, String date) {
    File root = new File(context.getFilesDir(), "sleep-audio-monitoring");
    if (date != null && date.length() > 0) {
      return new File(root, "session-" + date + ".json");
    }
    File current = new File(root, "current.txt");
    try {
      if (current.exists()) {
        String currentDate = readFile(current).trim();
        if (currentDate.length() > 0) {
          return new File(root, "session-" + currentDate + ".json");
        }
      }
    } catch (Exception ignored) {}
    return new File(root, "session-unknown.json");
  }

  private JSONArray clipsFromDirectory(Context context, String date, String sessionId) throws Exception {
    JSONArray events = new JSONArray();
    File dir = new File(new File(context.getFilesDir(), "sleep-audio-monitoring"), date);
    File[] clips = dir.listFiles((file) -> file.isFile() && file.getName().startsWith("event-") && file.getName().endsWith(".wav"));
    if (clips == null || clips.length == 0) {
      return events;
    }

    Arrays.sort(clips, Comparator.comparing(File::getName));
    for (int index = 0; index < clips.length; index += 1) {
      File clip = clips[index];
      JSONObject event = new JSONObject();
      event.put("id", (sessionId != null && sessionId.length() > 0 ? sessionId : "sleep-audio-session:" + date) + ":clip:" + index);
      event.put("startedAt", isoForMillis(clip.lastModified()));
      event.put("durationMs", 0);
      event.put("type", "unknown");
      event.put("localClipUri", android.net.Uri.fromFile(clip).toString());
      events.put(event);
    }
    return events;
  }

  private String previewClipFromDirectory(Context context, String date) {
    File clip = new File(new File(new File(context.getFilesDir(), "sleep-audio-monitoring"), date), "preview.wav");
    if (!clip.exists()) {
      return null;
    }
    return android.net.Uri.fromFile(clip).toString();
  }

  private String isoForMillis(long millis) {
    return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
      .format(new java.util.Date(millis));
  }

  private void deleteSessionFiles(Context context, String date) {
    File root = new File(context.getFilesDir(), "sleep-audio-monitoring");
    deleteRecursively(new File(root, date));
    deleteRecursively(new File(root, "session-" + date + ".json"));
  }

  private void deleteRecursively(File file) {
    if (!file.exists()) {
      return;
    }
    if (file.isDirectory()) {
      File[] children = file.listFiles();
      if (children != null) {
        for (File child : children) {
          deleteRecursively(child);
        }
      }
    }
    file.delete();
  }

  private String readFile(File file) throws Exception {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    try (FileInputStream input = new FileInputStream(file)) {
      byte[] buffer = new byte[4096];
      int read;
      while ((read = input.read(buffer)) != -1) {
        output.write(buffer, 0, read);
      }
    }
    return new String(output.toByteArray(), StandardCharsets.UTF_8);
  }

  private WritableArray jsonArrayToWritable(JSONArray array) throws Exception {
    WritableArray writable = Arguments.createArray();
    if (array == null) {
      return writable;
    }
    for (int index = 0; index < array.length(); index += 1) {
      Object value = array.get(index);
      if (value instanceof JSONObject) {
        writable.pushMap(jsonObjectToWritable((JSONObject) value));
      } else if (value instanceof String) {
        writable.pushString((String) value);
      } else if (value instanceof Integer) {
        writable.pushInt((Integer) value);
      } else if (value instanceof Double) {
        writable.pushDouble((Double) value);
      } else if (value instanceof Boolean) {
        writable.pushBoolean((Boolean) value);
      }
    }
    return writable;
  }

  private WritableMap jsonObjectToWritable(JSONObject object) throws Exception {
    WritableMap writable = Arguments.createMap();
    JSONArray names = object.names();
    if (names == null) {
      return writable;
    }
    for (int index = 0; index < names.length(); index += 1) {
      String key = names.getString(index);
      Object value = object.get(key);
      if (value instanceof JSONObject) {
        writable.putMap(key, jsonObjectToWritable((JSONObject) value));
      } else if (value instanceof JSONArray) {
        writable.putArray(key, jsonArrayToWritable((JSONArray) value));
      } else if (value instanceof String) {
        writable.putString(key, (String) value);
      } else if (value instanceof Integer) {
        writable.putInt(key, (Integer) value);
      } else if (value instanceof Long) {
        writable.putDouble(key, ((Long) value).doubleValue());
      } else if (value instanceof Double) {
        writable.putDouble(key, (Double) value);
      } else if (value instanceof Boolean) {
        writable.putBoolean(key, (Boolean) value);
      }
    }
    return writable;
  }
}
`;
}

function createServiceSource(packageName) {
  return `package ${packageName}.sleepaudio;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

public class SleepAudioForegroundService extends Service {
  public static final String ACTION_START = "sleep_audio.START";
  public static final String ACTION_STOP = "sleep_audio.STOP";
  public static final String EXTRA_DATE = "date";
  public static final String EXTRA_SESSION_ID = "sessionId";

  private static final String CHANNEL_ID = "sleep_audio_monitoring";
  private static final int NOTIFICATION_ID = 7201;
  private static final int SAMPLE_RATE = 16000;
  private static final int FRAME_SECONDS = 1;
  private static final int MAX_EVENT_GAP_FRAMES = 2;
  private static final int MIN_EVENT_MS = 800;
  private static final int MAX_CLIP_SECONDS = 30;
  private static final int PREVIEW_CLIP_SECONDS = 60;
  private static final int MIN_PLAYBACK_NORMALIZE_PEAK = 300;
  private static final int TARGET_PLAYBACK_PEAK = 18000;
  private static final double MAX_PLAYBACK_GAIN = 200.0;
  private static final long MAX_SESSION_MS = 10L * 60L * 60L * 1000L;

  private static volatile boolean running = false;

  private AudioRecord audioRecord;
  private Thread recordingThread;
  private String date;
  private String sessionId;
  private String startedAt;
  private String localAudioUri;
  private final List<JSONObject> events = new ArrayList<>();
  private int eventIndex = 0;

  public static boolean isRunning() {
    return running;
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null && ACTION_STOP.equals(intent.getAction())) {
      String stoppedDate = intent.getStringExtra(EXTRA_DATE);
      if (stoppedDate != null && stoppedDate.length() > 0) {
        date = stoppedDate;
      }
      stopMonitoring();
      return START_NOT_STICKY;
    }

    if (intent != null && ACTION_START.equals(intent.getAction())) {
      date = intent.getStringExtra(EXTRA_DATE);
      sessionId = intent.getStringExtra(EXTRA_SESSION_ID);
      startForeground(NOTIFICATION_ID, createNotification());
      startMonitoring();
    }

    return START_STICKY;
  }

  @Override
  public void onDestroy() {
    stopMonitoring();
    super.onDestroy();
  }

  private void startMonitoring() {
    if (running) {
      return;
    }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      writeStatus(false, "麦克风权限未授权。");
      stopSelf();
      return;
    }

    running = true;
    startedAt = nowIso();
    localAudioUri = null;
    events.clear();
    eventIndex = 0;
    writeCurrentDate();
    writeStatus(true, null);

    recordingThread = new Thread(() -> {
      String failureMessage = null;
      try {
        recordLoop();
      } catch (Exception error) {
        failureMessage = error.getMessage();
      } finally {
        running = false;
        releaseRecorder();
        writeStatus(false, failureMessage);
        recordingThread = null;
        stopForeground(true);
        stopSelf();
      }
    }, "SleepAudioMonitoring");
    recordingThread.start();
  }

  private void stopMonitoring() {
    running = false;
    Thread thread = recordingThread;
    if (thread == null) {
      releaseRecorder();
      writeStatus(false, null);
      stopForeground(true);
      stopSelf();
      return;
    }

    if (thread != null && thread != Thread.currentThread() && thread.isAlive()) {
      try {
        thread.join(2500);
      } catch (InterruptedException error) {
        Thread.currentThread().interrupt();
      }
    }

    if (!thread.isAlive()) {
      return;
    }

    releaseRecorder();
    writeStatus(false, null);
    stopForeground(true);
    stopSelf();
  }

  private void recordLoop() throws Exception {
    int frameSamples = SAMPLE_RATE * FRAME_SECONDS;
    int minBufferSize = AudioRecord.getMinBufferSize(
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT
    );
    int bufferSize = Math.max(minBufferSize, frameSamples * 2);
    short[] frame = new short[frameSamples];

    audioRecord = new AudioRecord(
      MediaRecorder.AudioSource.MIC,
      SAMPLE_RATE,
      AudioFormat.CHANNEL_IN_MONO,
      AudioFormat.ENCODING_PCM_16BIT,
      bufferSize
    );
    if (audioRecord.getState() != AudioRecord.STATE_INITIALIZED) {
      throw new IllegalStateException("麦克风监听初始化失败。");
    }
    audioRecord.startRecording();

    long startedMs = System.currentTimeMillis();
    Analyzer analyzer = new Analyzer();

    while (running && System.currentTimeMillis() - startedMs < MAX_SESSION_MS) {
      int read = audioRecord.read(frame, 0, frame.length);
      if (read > 0) {
        analyzer.accept(frame, read);
      }
    }

    analyzer.finish();
  }

  private class Analyzer {
    private int baselineFrames = 0;
    private double baselineDbTotal = 0;
    private double thresholdDb = -48.0;
    private boolean active = false;
    private int silenceFrames = 0;
    private long eventStartedMs = 0;
    private double eventPeakDb = -120.0;
    private double eventAverageDbTotal = 0;
    private double eventZcrTotal = 0;
    private int eventFrames = 0;
    private long eventSoundDurationMs = 0;
    private final ByteArrayOutputStream clipBuffer = new ByteArrayOutputStream();
    private final ByteArrayOutputStream previewBuffer = new ByteArrayOutputStream();

    void accept(short[] frame, int read) throws Exception {
      AudioFrameStats stats = statsForFrame(frame, read);
      long frameDurationMs = durationMsForSamples(read);
      byte[] pcmBytes = pcmBytesForFrame(frame, read);
      appendPreviewFrame(pcmBytes);
      updateBaseline(stats.averageDb);
      boolean hasSound = stats.averageDb > thresholdDb || stats.peakDb > thresholdDb + 8.0;

      if (hasSound) {
        if (!active) {
          active = true;
          eventStartedMs = Math.max(0, System.currentTimeMillis() - frameDurationMs);
          eventPeakDb = stats.peakDb;
          eventAverageDbTotal = 0;
          eventZcrTotal = 0;
          eventFrames = 0;
          eventSoundDurationMs = 0;
          clipBuffer.reset();
        }
        silenceFrames = 0;
        appendFrame(pcmBytes);
        eventPeakDb = Math.max(eventPeakDb, stats.peakDb);
        eventAverageDbTotal += stats.averageDb;
        eventZcrTotal += stats.zeroCrossingRate;
        eventFrames += 1;
        eventSoundDurationMs += frameDurationMs;
        return;
      }

      if (active) {
        silenceFrames += 1;
        appendFrame(pcmBytes);
        if (silenceFrames >= MAX_EVENT_GAP_FRAMES) {
          finalizeEvent();
        }
      }
    }

    void finish() throws Exception {
      if (active) {
        finalizeEvent();
      }
      if (events.isEmpty() && previewBuffer.size() > 0) {
        File preview = writePreviewFile(previewBuffer.toByteArray());
        localAudioUri = Uri.fromFile(preview).toString();
      }
    }

    private void updateBaseline(double averageDb) {
      if (active || baselineFrames >= 30) {
        return;
      }
      baselineDbTotal += averageDb;
      baselineFrames += 1;
      double baseline = baselineDbTotal / Math.max(1, baselineFrames);
      thresholdDb = Math.max(-48.0, baseline + 10.0);
    }

    private void appendPreviewFrame(byte[] pcmBytes) {
      int maxBytes = SAMPLE_RATE * PREVIEW_CLIP_SECONDS * 2;
      if (previewBuffer.size() + pcmBytes.length <= maxBytes) {
        previewBuffer.write(pcmBytes, 0, pcmBytes.length);
        return;
      }

      byte[] current = previewBuffer.toByteArray();
      previewBuffer.reset();
      int keepBytes = Math.max(0, maxBytes - pcmBytes.length);
      if (keepBytes > 0 && current.length > 0) {
        int start = Math.max(0, current.length - keepBytes);
        previewBuffer.write(current, start, current.length - start);
      }
      previewBuffer.write(pcmBytes, 0, Math.min(pcmBytes.length, maxBytes));
    }

    private void appendFrame(byte[] pcmBytes) {
      int maxBytes = SAMPLE_RATE * MAX_CLIP_SECONDS * 2;
      if (clipBuffer.size() >= maxBytes) {
        return;
      }
      int remaining = maxBytes - clipBuffer.size();
      clipBuffer.write(pcmBytes, 0, Math.min(pcmBytes.length, remaining));
    }

    private void finalizeEvent() throws Exception {
      long durationMs = Math.max(0, eventSoundDurationMs);
      if (durationMs >= MIN_EVENT_MS && eventFrames > 0) {
        double averageDb = eventAverageDbTotal / eventFrames;
        double averageZcr = eventZcrTotal / eventFrames;
        String type = classifyEvent(durationMs, averageDb, eventPeakDb, averageZcr);
        double confidence = confidenceFor(type, averageDb, eventPeakDb, averageZcr);
        File clip = writeClipFile(clipBuffer.toByteArray());

        JSONObject event = new JSONObject();
        event.put("id", sessionId + ":event:" + eventIndex);
        event.put("startedAt", isoForMillis(eventStartedMs));
        event.put("durationMs", durationMs);
        event.put("type", type);
        event.put("confidence", confidence);
        event.put("localClipUri", Uri.fromFile(clip).toString());
        event.put("peakDb", eventPeakDb);
        event.put("averageDb", averageDb);
        events.add(event);
        eventIndex += 1;
        writeStatus(true, null);
      }

      active = false;
      silenceFrames = 0;
      eventSoundDurationMs = 0;
      clipBuffer.reset();
    }
  }

  private long durationMsForSamples(int sampleCount) {
    return Math.max(1L, Math.round(sampleCount * 1000.0 / SAMPLE_RATE));
  }

  private byte[] pcmBytesForFrame(short[] frame, int read) {
    ByteBuffer bytes = ByteBuffer.allocate(read * 2).order(ByteOrder.LITTLE_ENDIAN);
    for (int index = 0; index < read; index += 1) {
      bytes.putShort(frame[index]);
    }
    return bytes.array();
  }

  private AudioFrameStats statsForFrame(short[] frame, int read) {
    double sumSquares = 0;
    int peak = 0;
    int crossings = 0;
    int previous = 0;

    for (int index = 0; index < read; index += 1) {
      int sample = frame[index];
      sumSquares += sample * sample;
      peak = Math.max(peak, Math.abs(sample));
      if (index > 0 && ((sample >= 0 && previous < 0) || (sample < 0 && previous >= 0))) {
        crossings += 1;
      }
      previous = sample;
    }

    double rms = Math.sqrt(sumSquares / Math.max(1, read));
    return new AudioFrameStats(
      dbForAmplitude(rms),
      dbForAmplitude(peak),
      crossings / (double) Math.max(1, read - 1)
    );
  }

  private double dbForAmplitude(double amplitude) {
    return 20.0 * Math.log10(Math.max(1.0, amplitude) / 32767.0);
  }

  private String classifyEvent(long durationMs, double averageDb, double peakDb, double zcr) {
    if (durationMs >= 1200 && zcr < 0.08 && averageDb > -46.0) {
      return "snore_like";
    }
    if (durationMs >= 800 && zcr >= 0.06 && zcr <= 0.28) {
      return "voice_like";
    }
    if (durationMs < 1200 || peakDb > -20.0) {
      return "noise_like";
    }
    return "unknown";
  }

  private double confidenceFor(String type, double averageDb, double peakDb, double zcr) {
    double levelScore = Math.min(0.35, Math.max(0.0, (averageDb + 55.0) / 80.0));
    double shapeScore = "unknown".equals(type) ? 0.0 : 0.25;
    double peakScore = peakDb > -28.0 ? 0.2 : 0.1;
    double zcrScore = zcr > 0.02 && zcr < 0.35 ? 0.12 : 0.04;
    return Math.min(0.92, Math.max(0.45, 0.35 + levelScore + shapeScore + peakScore + zcrScore));
  }

  private File writeClipFile(byte[] pcmBytes) throws Exception {
    File dir = new File(rootDir(), date);
    if (!dir.exists()) {
      dir.mkdirs();
    }
    File clip = new File(dir, "event-" + eventIndex + ".wav");
    try (FileOutputStream output = new FileOutputStream(clip)) {
      writeWav(output, normalizePcmForPlayback(pcmBytes));
    }
    return clip;
  }

  private File writePreviewFile(byte[] pcmBytes) throws Exception {
    File dir = new File(rootDir(), date);
    if (!dir.exists()) {
      dir.mkdirs();
    }
    File clip = new File(dir, "preview.wav");
    try (FileOutputStream output = new FileOutputStream(clip)) {
      writeWav(output, normalizePcmForPlayback(pcmBytes));
    }
    return clip;
  }

  private byte[] normalizePcmForPlayback(byte[] pcmBytes) {
    int peak = 0;
    for (int index = 0; index + 1 < pcmBytes.length; index += 2) {
      int sample = ByteBuffer.wrap(pcmBytes, index, 2).order(ByteOrder.LITTLE_ENDIAN).getShort();
      peak = Math.max(peak, Math.abs(sample));
    }

    if (peak < MIN_PLAYBACK_NORMALIZE_PEAK || peak >= TARGET_PLAYBACK_PEAK) {
      return pcmBytes;
    }

    double gain = Math.min(MAX_PLAYBACK_GAIN, TARGET_PLAYBACK_PEAK / (double) peak);
    byte[] amplified = new byte[pcmBytes.length];
    for (int index = 0; index + 1 < pcmBytes.length; index += 2) {
      int sample = ByteBuffer.wrap(pcmBytes, index, 2).order(ByteOrder.LITTLE_ENDIAN).getShort();
      int boosted = (int) Math.round(sample * gain);
      short clipped = (short) Math.max(Short.MIN_VALUE, Math.min(Short.MAX_VALUE, boosted));
      byte[] bytes = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(clipped).array();
      amplified[index] = bytes[0];
      amplified[index + 1] = bytes[1];
    }
    return amplified;
  }

  private void writeWav(FileOutputStream output, byte[] pcmBytes) throws Exception {
    int byteRate = SAMPLE_RATE * 2;
    int dataSize = pcmBytes.length;
    int riffSize = 36 + dataSize;

    output.write("RIFF".getBytes(StandardCharsets.US_ASCII));
    writeInt(output, riffSize);
    output.write("WAVE".getBytes(StandardCharsets.US_ASCII));
    output.write("fmt ".getBytes(StandardCharsets.US_ASCII));
    writeInt(output, 16);
    writeShort(output, 1);
    writeShort(output, 1);
    writeInt(output, SAMPLE_RATE);
    writeInt(output, byteRate);
    writeShort(output, 2);
    writeShort(output, 16);
    output.write("data".getBytes(StandardCharsets.US_ASCII));
    writeInt(output, dataSize);
    output.write(pcmBytes);
  }

  private void writeInt(FileOutputStream output, int value) throws Exception {
    output.write(ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(value).array());
  }

  private void writeShort(FileOutputStream output, int value) throws Exception {
    output.write(ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort((short) value).array());
  }

  private void writeStatus(boolean isRunning, String lastError) {
    try {
      File root = rootDir();
      if (!root.exists()) {
        root.mkdirs();
      }

      JSONObject status = new JSONObject();
      status.put("isRunning", isRunning);
      status.put("sessionId", sessionId);
      status.put("date", date);
      status.put("startedAt", startedAt);
      if (!isRunning) {
        status.put("stoppedAt", nowIso());
      }
      status.put("eventCount", events.size());
      status.put("events", new JSONArray(events));
      if (localAudioUri != null) {
        status.put("localAudioUri", localAudioUri);
      }
      status.put("summary", summaryJson());
      if (lastError != null) {
        status.put("lastError", lastError);
      }

      writeTextFile(statusFile(), status.toString());
    } catch (Exception ignored) {}
  }

  private JSONObject summaryJson() throws Exception {
    int voiceCount = countEvents("voice_like");
    int snoreCount = countEvents("snore_like");
    int noiseCount = countEvents("noise_like");
    int coughCount = countEvents("cough_like");
    int movementCount = countEvents("movement_like");
    long totalDuration = durationFor(null);
    long voiceDuration = durationFor("voice_like");
    long snoreDuration = durationFor("snore_like");
    double peakDb = peakDb();

    JSONObject summary = new JSONObject();
    summary.put("hasVoiceLikeSound", voiceCount > 0);
    summary.put("hasSnoreLikeSound", snoreCount > 0);
    summary.put("eventCount", events.size());
    summary.put("voiceLikeCount", voiceCount);
    summary.put("snoreLikeCount", snoreCount);
    summary.put("coughLikeCount", coughCount);
    summary.put("movementLikeCount", movementCount);
    summary.put("noiseLikeCount", noiseCount);
    summary.put("totalEventDurationMs", totalDuration);
    summary.put("totalVoiceLikeDurationMs", voiceDuration);
    summary.put("totalSnoreLikeDurationMs", snoreDuration);
    summary.put("peakDb", peakDb);
    summary.put("quietScore", quietScore(totalDuration));
    return summary;
  }

  private int countEvents(String type) throws Exception {
    int count = 0;
    for (JSONObject event : events) {
      if (type.equals(event.optString("type"))) {
        count += 1;
      }
    }
    return count;
  }

  private long durationFor(String type) {
    long total = 0;
    for (JSONObject event : events) {
      if (type == null || type.equals(event.optString("type"))) {
        total += event.optLong("durationMs", 0);
      }
    }
    return total;
  }

  private double peakDb() {
    double value = -120.0;
    for (JSONObject event : events) {
      value = Math.max(value, event.optDouble("peakDb", -120.0));
    }
    return value;
  }

  private int quietScore(long totalDurationMs) {
    if (events.isEmpty()) {
      return 92;
    }
    return Math.max(20, Math.min(88, 88 - events.size() * 4 - (int) (totalDurationMs / 60000L)));
  }

  private File rootDir() {
    return new File(getFilesDir(), "sleep-audio-monitoring");
  }

  private File statusFile() {
    return new File(rootDir(), "session-" + date + ".json");
  }

  private void writeCurrentDate() {
    try {
      File root = rootDir();
      if (!root.exists()) {
        root.mkdirs();
      }
      writeTextFile(new File(root, "current.txt"), date);
    } catch (Exception ignored) {}
  }

  private void writeTextFile(File file, String contents) throws Exception {
    try (FileOutputStream output = new FileOutputStream(file)) {
      output.write(contents.getBytes(StandardCharsets.UTF_8));
    }
  }

  private Notification createNotification() {
    NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        "睡眠监听",
        NotificationManager.IMPORTANCE_LOW
      );
      channel.setDescription("睡眠监听运行时用于提示麦克风正在本机监听。");
      manager.createNotificationChannel(channel);
    }

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(this, CHANNEL_ID)
      : new Notification.Builder(this);

    return builder
      .setContentTitle("睡眠监听正在运行")
      .setContentText("正在本机记录夜间声音线索，可随时回到 App 停止。")
      .setSmallIcon(getApplicationInfo().icon)
      .setOngoing(true)
      .build();
  }

  private String nowIso() {
    return isoForMillis(System.currentTimeMillis());
  }

  private String isoForMillis(long millis) {
    return new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", java.util.Locale.US)
      .format(new java.util.Date(millis));
  }

  private void releaseRecorder() {
    try {
      if (audioRecord != null) {
        audioRecord.stop();
        audioRecord.release();
      }
    } catch (Exception ignored) {
    } finally {
      audioRecord = null;
    }
  }

  private static class AudioFrameStats {
    final double averageDb;
    final double peakDb;
    final double zeroCrossingRate;

    AudioFrameStats(double averageDb, double peakDb, double zeroCrossingRate) {
      this.averageDb = averageDb;
      this.peakDb = peakDb;
      this.zeroCrossingRate = zeroCrossingRate;
    }
  }
}
`;
}

module.exports = function withSleepAudioMonitoring(config) {
  config = withSleepAudioManifest(config);
  config = withSleepAudioMainApplication(config);
  config = withSleepAudioSources(config);
  return config;
};
