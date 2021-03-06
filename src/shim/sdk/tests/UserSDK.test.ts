import * as UserSDK from "../UserSDK";
import * as FrameMediator from "../../FrameMediator";
import Future from "futurejs";
import * as ShimUtils from "../../ShimUtils";

describe("UserSDK", () => {
    beforeEach(() => {
        spyOn(FrameMediator, "sendMessage").and.returnValue(Future.of({message: "messageResponse"}));
    });

    afterEach(() => {
        ShimUtils.clearSDKInitialized();
    });

    describe("user API", () => {
        describe("deauthorizeDevice", () => {
            it("throws if SDK has not yet been initialized", () => {
                ShimUtils.clearSDKInitialized();
                expect(() => UserSDK.deauthorizeDevice()).toThrow();
            });

            it("sends deauth request type to frame", (done) => {
                ShimUtils.setSDKInitialized();
                spyOn(ShimUtils, "clearParentWindowSymmetricKey");
                UserSDK.deauthorizeDevice()
                    .then((result: any) => {
                        expect(result).toEqual({transformKeyDeleted: "messageResponse"});
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "DEAUTHORIZE_DEVICE",
                            message: null,
                        });
                        expect(ShimUtils.clearParentWindowSymmetricKey).toHaveBeenCalledWith();
                        done();
                    })
                    .catch((e) => fail(e.message));
            });
        });

        describe("changePasscode", () => {
            it("throws if SDK has not yet been initialized", () => {
                ShimUtils.clearSDKInitialized();
                expect(() => UserSDK.changePasscode("current", "new")).toThrow();
            });

            it("sends change password payload to frame", (done) => {
                ShimUtils.setSDKInitialized();
                UserSDK.changePasscode("current", "new")
                    .then((result: any) => {
                        expect(result).toBeUndefined();
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "CHANGE_USER_PASSCODE",
                            message: {
                                currentPasscode: "current",
                                newPasscode: "new",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e.message));
            });
        });

        describe("rotateMasterKey", () => {
            it("throw if SDK has not yet been initalized", () => {
                ShimUtils.clearSDKInitialized();
                expect(() => UserSDK.rotateMasterKey("current")).toThrow();
            });

            it("send rotate user private key payload to the frame", (done) => {
                ShimUtils.setSDKInitialized();
                UserSDK.rotateMasterKey("current")
                    .then((result: any) => {
                        expect(result).toBeUndefined();
                        expect(FrameMediator.sendMessage).toHaveBeenCalledWith({
                            type: "ROTATE_USER_PRIVATE_KEY",
                            message: {
                                passcode: "current",
                            },
                        });
                        done();
                    })
                    .catch((e) => fail(e.message));
            });
        });
    });
});
