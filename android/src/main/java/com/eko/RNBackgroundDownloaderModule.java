package com.eko;

import androidx.annotation.NonNull;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.module.annotations.ReactModule;
import java.util.Map;

@ReactModule(name = RNBackgroundDownloaderModuleImpl.NAME)
public class RNBackgroundDownloaderModule extends NativeRNBackgroundDownloaderSpec {
  private final RNBackgroundDownloaderModuleImpl module;

  public RNBackgroundDownloaderModule(ReactApplicationContext reactContext) {
    super(reactContext);
    module = new RNBackgroundDownloaderModuleImpl(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return module.getName();
  }

  @Override
  protected Map<String, Object> getTypedExportedConstants() {
    return module.getConstants();
  }

  @Override
  public void initialize() {
    super.initialize();
    module.initialize();
  }

  @Override
  public void invalidate() {
    module.invalidate();
  }

  @ReactMethod
  public void download(ReadableMap options) {
    module.download(options);
  }

  @ReactMethod
  public void pauseTask(String configId) {
    module.pauseTask(configId);
  }

  @ReactMethod
  public void resumeTask(String configId) {
    module.resumeTask(configId);
  }

  @ReactMethod
  public void stopTask(String configId) {
    module.stopTask(configId);
  }

  @ReactMethod
  public void completeHandler(String configId) {
    module.completeHandler(configId);
  }

  @ReactMethod
  public void checkForExistingDownloads(Promise promise) {
    module.checkForExistingDownloads(promise);
  }

  @ReactMethod
  public void addListener(String eventName) {
    module.addListener(eventName);
  }

  @ReactMethod
  public void removeListeners(double count) {
    module.removeListeners(count);
  }
}
