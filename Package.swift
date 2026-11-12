// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "LeapCoreSDK",
    products: [
        .library(name: "LeapCoreSDK", targets: ["LeapCoreSDK"])
    ],
    targets: [
        .binaryTarget(
            name: "LeapCoreSDK",
            url: "https://github.com/Leap-Platform/leap-core-ios/releases/download/2.3.0/LeapCoreSDK.xcframework.zip",
            checksum: "64b5336ef5f7736600af9b759a1ca9e0ba0792e1f0f1be0424937261440bf552"
        )
    ]
)
