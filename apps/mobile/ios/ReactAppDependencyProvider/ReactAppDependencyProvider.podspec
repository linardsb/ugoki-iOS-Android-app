# Workaround for expo-dev-launcher requiring ReactAppDependencyProvider
Pod::Spec.new do |s|
  s.name         = "ReactAppDependencyProvider"
  s.version      = "0.0.1"
  s.summary      = "Empty spec for expo-dev-launcher compatibility"
  s.homepage     = "https://github.com/expo/expo"
  s.license      = "MIT"
  s.author       = "Expo"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "" }
  s.source_files = "**/*.{h,m,mm,swift}"
end
