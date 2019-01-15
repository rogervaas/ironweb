import * as Init from "../index";
import ApiState from "../../ApiState";
import * as TestUtils from "../../../tests/TestUtils";
import * as FrameUtils from "../../FrameUtils";
import Future from "futurejs";
import * as InitializationApi from "../InitializationApi";

describe("init index", () => {
    describe("initialize", () => {
        afterEach(() => {
            localStorage.clear();
        });

        it("sets user on state with verify response when users exists", (done) => {
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                })
            );

            Init.initialize("jwtToken").engage(
                (e) => fail(e),
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(InitializationApi.initializeApi).toHaveBeenCalledWith("jwtToken");
                    const user = ApiState.user();
                    expect(user.id).toEqual("user-10");
                    expect(user.segmentId).toEqual(1);
                    expect(user.status).toEqual(1);
                    done();
                }
            );
        });

        it("does not update user state when user does not exist on verify response", (done) => {
            (ApiState as any).apiUser = undefined; //Clear out user state from prior tests
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: undefined,
                })
            );

            Init.initialize("jwtToken").engage(
                (e) => fail(e),
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: false,
                        },
                    });
                    expect(InitializationApi.initializeApi).toHaveBeenCalledWith("jwtToken");
                    expect(ApiState.user()).toBeUndefined();
                    done();
                }
            );
        });

        it("clears local device keys when no sym key provided and returns passcode response", (done) => {
            (ApiState as any).apiUser = undefined; //Clear out user state from prior tests
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                })
            );
            spyOn(InitializationApi, "fetchAndValidateLocalKeys");
            spyOn(FrameUtils, "clearDeviceAndSigningKeys");

            Init.initialize("jwtToken", undefined).engage(
                (e) => fail(e),
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(InitializationApi.fetchAndValidateLocalKeys).not.toHaveBeenCalled();
                    expect(FrameUtils.clearDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1);
                    expect(ApiState.user()).toBeObject();
                    done();
                }
            );
        });

        it("expects passcode response when local keys cannot be found or validated", (done) => {
            spyOn(InitializationApi, "fetchAndValidateLocalKeys").and.returnValue(Future.reject(new Error("failed")));

            (ApiState as any).apiUser = undefined; //Clear out user state from prior tests
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                })
            );

            Init.initialize("jwtToken", "symKey").engage(
                (e) => fail(e),
                (results) => {
                    expect(results).toEqual({
                        type: "INIT_PASSCODE_REQUIRED",
                        message: {
                            doesUserExist: true,
                        },
                    });
                    expect(ApiState.user()).toBeObject();
                    done();
                }
            );
        });

        it("returns with SDK object when device/signing keys are found locally", (done) => {
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                })
            );

            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            spyOn(InitializationApi, "fetchAndValidateLocalKeys").and.returnValue(Future.of({deviceKeys, signingKeys}));

            Init.initialize("jwtToken", "symKey").engage(
                (e) => fail(e),
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            user: {
                                id: "user-10",
                                status: 1,
                            },
                            symmetricKey: undefined,
                        },
                    });
                    expect(ApiState.userPublicKey()).toEqual(TestUtils.userPublicBytes);
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);
                    expect(ApiState.user()).toEqual(TestUtils.getFullUser());
                    expect(InitializationApi.fetchAndValidateLocalKeys).toHaveBeenCalledWith("user-10", 1, "symKey");
                    done();
                }
            );
        });
    });

    describe("createUser", () => {
        it("invokes create user request and sets API state before returning SDK response type", () => {
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            const userKeys = TestUtils.getEmptyKeyPair();

            spyOn(FrameUtils, "storeDeviceAndSigningKeys");

            spyOn(InitializationApi, "createUser").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                    keys: {
                        userKeys: {
                            ...userKeys,
                            encryptedPrivateKey: new Uint8Array(10),
                        },
                        deviceKeys,
                        signingKeys,
                        transformKey: TestUtils.getTransformKey(),
                    },
                    encryptedLocalKeys: {
                        encryptedDeviceKey: "edk",
                        encryptedSigningKey: "esk",
                        symmetricKey: "sk",
                        iv: "iv",
                    },
                })
            );

            Init.createUser("jwt", "passcode").engage(
                (e) => fail(e),
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            symmetricKey: "AAA=",
                            user: {
                                id: "user-10",
                                status: 1,
                            },
                        },
                    });
                    expect(InitializationApi.createUser).toHaveBeenCalledWith("passcode", "jwt");
                    expect(ApiState.userPublicKey()).toEqual(TestUtils.userPublicBytes);
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);
                    expect(ApiState.user()).toEqual(TestUtils.getFullUser());

                    expect(FrameUtils.storeDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1, "edk", "esk", "iv");
                }
            );
        });
    });

    describe("generateUserNewDeviceKeys", () => {
        it("decrypts user key and generates new keys", () => {
            ApiState.setCurrentUser(TestUtils.getFullUser());
            spyOn(InitializationApi, "initializeApi").and.returnValue(
                Future.of({
                    user: TestUtils.getFullUser(),
                })
            );
            spyOn(FrameUtils, "storeDeviceAndSigningKeys");
            const deviceKeys = TestUtils.getEmptyKeyPair();
            const signingKeys = TestUtils.getSigningKeyPair();
            spyOn(InitializationApi, "generateDeviceAndSigningKeys").and.returnValue(
                Future.of({
                    encryptedLocalKeys: {
                        encryptedDeviceKey: "edk",
                        encryptedSigningKey: "esk",
                        symmetricKey: "sk",
                        iv: "iv",
                    },
                    userUpdateKeys: {deviceKeys, signingKeys},
                })
            );
            spyOn(localStorage, "setItem");

            Init.generateUserNewDeviceKeys("jwtToken", "passcode").engage(
                (e) => fail(e),
                (SDK) => {
                    expect(SDK).toEqual({
                        type: "FULL_SDK_RESPONSE",
                        message: {
                            symmetricKey: "AAA=",
                            user: {
                                id: "user-10",
                                status: 1,
                            },
                        },
                    });
                    expect(InitializationApi.generateDeviceAndSigningKeys).toHaveBeenCalledWith(
                        "jwtToken",
                        "passcode",
                        new Uint8Array([]),
                        TestUtils.userPublicBytes
                    );
                    expect(ApiState.deviceKeys()).toEqual(deviceKeys);
                    expect(ApiState.signingKeys()).toEqual(signingKeys);

                    expect(FrameUtils.storeDeviceAndSigningKeys).toHaveBeenCalledWith("user-10", 1, "edk", "esk", "iv");
                }
            );
        });
    });
});
