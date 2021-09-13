// swift-tools-version:5.3

import PackageDescription

let package = Package(
    name: "LeapCoreSDK",
    products: [
        .library( name: "LeapCoreSDK", targets: ["LeapCoreSDK" ])
    ],
    targets: [
        .binaryTarget(
            name: "LeapCoreSDK", path: "LeapCoreSDK.xcframework"
        )
    ]
)
