package com.mysleepdream.app.sleepaudio;

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
