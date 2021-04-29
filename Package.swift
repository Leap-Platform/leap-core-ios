// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "LeapCoreSDK",
    products: [
        .library(name: "LeapCoreSDK", targets: ["LeapCoreSDK"]),
    ],
    dependencies: [
        .package(name: "Gzip", url: "https://github.com/1024jp/GzipSwift.git", "5.1.1" ..< "5.2.0")
    ],
    targets: [
        .binaryTarget(name: "LeapCoreSDK", path: "LeapCoreSDK.xcframework")
    ]
)