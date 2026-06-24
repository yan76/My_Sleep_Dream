package com.mysleepdream.app.sleepaudio;

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
