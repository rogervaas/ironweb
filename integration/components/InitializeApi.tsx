import RaisedButton from "material-ui/RaisedButton";
import {Tab, Tabs} from "material-ui/Tabs";
import TextField from "material-ui/TextField";
import * as React from "react";
import * as IronWeb from "../../src/shim";
import {logAction} from "../Logger";

interface InitializeApiProps {
    onComplete: () => void;
}

interface InitializeApiState {
    showSetPasscode: boolean;
    passcode: string;
}

const tabStyle = {
    marginTop: "15px",
    padding: "25px",
    textAlign: "center" as "center",
};

export default class InitializeApi extends React.Component<InitializeApiProps, InitializeApiState> {
    passcodeCallback?: (passcode: string) => void;

    constructor(props: InitializeApiProps) {
        super(props);
        this.state = {
            showSetPasscode: false,
            passcode: "",
        };
    }

    onPasscodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            passcode: event.currentTarget.value,
        });
    };

    handleEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.charCode === 13) {
            this.setPasscode();
        }
    };

    setPasscode = () => {
        if (this.state.passcode && this.passcodeCallback) {
            this.passcodeCallback(this.state.passcode);
        }
    };

    generateJWT(): Promise<string> {
        return fetch(`/generateJWT/${window.User.id}`)
            .then((response) => response.json())
            .then((jwt: string) => {
                logAction(`Got JWT token: ${jwt}`);
                return jwt;
            })
            .catch((error) => {
                logAction(`Failed to get JWT token: ${error.messsage}`, "error");
                return error;
            });
    }

    getUsersPasscode = (didUserExist: boolean): Promise<string> => {
        if (didUserExist) {
            logAction(`User exists, but no local keys. Need passcode in order to unlock user key to generate device/signing/transform key`);
        } else {
            logAction(`User doesn't exist. Need passcode to encrypt users private key before we create the user.`);
        }
        this.setState({showSetPasscode: true});
        //We need the users passcode so return a new Promise and store off the resolve function. We'll invoke it later once we have
        //the users passcode value.
        return new Promise((resolve) => {
            this.passcodeCallback = resolve;
        });
    };

    initialize = () => {
        logAction(`Calling SDK Init`);
        IronWeb.initialize(this.generateJWT, this.getUsersPasscode)
            .then((initializedResult) => {
                document.cookie = `integrationDemo=${JSON.stringify({id: window.User.id, name: window.User.name})};`;
                logAction(`Init complete. Initialized user ${initializedResult.user.id} who has status ${initializedResult.user.status}`, "success");
                if (initializedResult.user.needsRotation) {
                    logAction(`Rotating users key`);
                    return IronWeb.user.rotateMasterKey(this.state.passcode).then((res) => {
                        logAction(`Users master key rotated`);
                        logAction(JSON.stringify(res));
                        this.props.onComplete();
                    });
                } else {
                    this.props.onComplete();
                    return Promise.resolve();
                }
            })
            .catch((error: IronWeb.SDKError) => {
                logAction(`Initialize error: ${error.message}. Error Code: ${error.code}`, "error");
            });
    };

    getPasscodeInput() {
        return (
            <TextField
                key="passcode"
                id="api-passcode"
                autoFocus
                type="text"
                onKeyPress={this.handleEnter}
                hintText="Passcode"
                onChange={this.onPasscodeChange}
                value={this.state.passcode}
            />
        );
    }

    createUser = () => {
        logAction(`Creating user manually without device...`);
        IronWeb.createNewUser(this.generateJWT, this.state.passcode, {needsRotation: true})
            .then((res) => {
                logAction(`User manually created`, "success");
                logAction(JSON.stringify(res));
            })
            .catch((e) => logAction(`Failed to create user: '${e.message}'`, "error"));
    };

    createDevice = () => {
        logAction(`Creating device manually...`);
        IronWeb.createNewDeviceKeys(this.generateJWT, this.state.passcode)
            .then((res) => {
                logAction(`User device manually created`, "success");
                logAction(JSON.stringify(res));
            })
            .catch((e) => logAction(`Failed to create user device: '${e.message}'`, "error"));
    };

    getInitUIElement() {
        if (this.state.showSetPasscode) {
            return [
                this.getPasscodeInput(),
                <RaisedButton className="set-passcode" key="set-passcode" secondary onClick={this.setPasscode} label="Set Passcode" />,
            ];
        }
        return <RaisedButton className="initialize-api-start" secondary onClick={this.initialize} label="Initialize Api" />;
    }

    render() {
        return (
            <Tabs style={{width: "350px"}} className="initialize-api">
                <Tab label="Initialize" onActive={() => this.setState({passcode: ""})}>
                    <div style={tabStyle}>{this.getInitUIElement()}</div>
                </Tab>
                <Tab label="Manual" onActive={() => this.setState({passcode: ""})}>
                    <div style={{...tabStyle}}>
                        {this.getPasscodeInput()}
                        <RaisedButton className="initialize-create-user" secondary onClick={this.createUser} label="Create User" />
                        <br />
                        <br />
                        <RaisedButton className="initialize-create-device" secondary onClick={this.createDevice} label="Create Device" />
                    </div>
                </Tab>
            </Tabs>
        );
    }
}
