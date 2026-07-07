export function isWeChatWebView(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent): boolean {
  return /MicroMessenger/i.test(userAgent)
}

export function shouldDeferTtsAutoplay(): boolean {
  return isWeChatWebView()
}
