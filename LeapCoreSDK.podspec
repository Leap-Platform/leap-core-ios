Pod::Spec.new do |s|
    s.name          = "LeapCoreSDK"
    s.version       = "2.3.0"
    s.summary       = "Product engagement made easy"
    s.description   = <<-DESC
    Product engagement made easy. Onboard, nudge, & delight your mobile users
                     DESC
    s.homepage      = "https://whatfix.com/products/mobile/"
    s.platform      = :ios, "10.0"
    s.swift_versions = ['5.0']
    s.license       = { :type => "Commercial", :file => "LICENSE.md" }
    s.author        = { "Aravind G S" => "aravind.gs@whatfix.com" }
    s.source        = { :http => "https://github.com/Leap-Platform/leap-core-ios/releases/download/2.3.0/LeapCoreSDK.xcframework.zip", :sha256 => "64b5336ef5f7736600af9b759a1ca9e0ba0792e1f0f1be0424937261440bf552" }
    s.vendored_frameworks = "LeapCoreSDK.xcframework"
    s.frameworks    = 'UIKit', 'Webkit', 'AVFoundation'
  end
