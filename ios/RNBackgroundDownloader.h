#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNBackgroundDownloaderSpec.h"
#endif

typedef void (^CompletionHandler)();

@interface RNBackgroundDownloader : RCTEventEmitter <
  RCTBridgeModule,
  NSURLSessionDelegate,
  NSURLSessionDownloadDelegate
#ifdef RCT_NEW_ARCH_ENABLED
  , NativeRNBackgroundDownloaderSpec
#endif
>

+ (void)setCompletionHandlerWithIdentifier:(NSString *)identifier completionHandler:(CompletionHandler)completionHandler;

@end
