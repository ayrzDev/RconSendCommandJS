class RCON {
    constructor(ip, port, password, provider = require("modern-rcon")) {
        this.provider = provider;
        this.rcon = new this.provider(ip, port, password);
    };

    async connect() {
        return await this.rcon.connect();
    };

    async send(command) {
        return await this.rcon.send(command);
    };

    async close() {
        return await this.rcon.disconnect();
    };
}

const {stdin} = process;
stdin.setRawMode(true);
let _stdinData = [];

class ConsoleReader {
    static resumeStdin() {
        stdin.resume();
        stdin.setEncoding("utf8");
    };

    static pauseStdin() {
        stdin.pause();
    }

    static onStdinData(callback) {
        _stdinData.push(callback);
        stdin.on("data", callback);
        return {
            remove: () => {
                _stdinData.splice(_stdinData.indexOf(callback), 1);
                stdin.off("data", callback);
            }
        };
    };

    static removeStdinCallbacks = () => {
        _stdinData.forEach(i => stdin.removeListener("data", i));
        _stdinData = [];
    };

    static readLine({show = false} = {}) {
        return new Promise(resolve => {
            this.resumeStdin();
            let dat = "";
            const rem = this.onStdinData(data => {
                if (data === "\x03") return process.exit();
                if (data[0] === "\n" || data[0] === "\r") {
                    this.pauseStdin();
                    rem.remove();
                    resolve(dat);
                } else if (data === "\b") {
                    if (dat.length > 0) {
                        dat = dat.substring(0, dat.length - 1);
                        if (show) process.stdout.write("\b ");
                    }
                } else dat += data;
                if (show) process.stdout.write(data);
            });
        });
    };

    static readKey({show = false, amount = 1} = {}) {
        return new Promise(resolve => {
            this.resumeStdin();
            let dat = "";
            const rem = this.onStdinData(data => {
                if (data === "\x03") return process.exit();
                if (data === "\b") {
                    if (dat.length > 0) {
                        dat = dat.substring(0, dat.length - 1);
                        if (show) process.stdout.write("\b ");
                    }
                } else dat += data;
                if (dat.length >= amount) {
                    this.pauseStdin();
                    rem.remove();
                    resolve(dat);
                }
                if (show) process.stdout.write(data);
            });
        });
    };
}

(async () => {
    process.stdout.write("IP Address: ");
    const ip = await ConsoleReader.readLine({show: true});
    process.stdout.write("\n");
    process.stdout.write("Port: ");
    const port = await ConsoleReader.readLine({show: true})
    process.stdout.write("\n");
    process.stdout.write("Password: ");
    const password = await ConsoleReader.readLine({show: false});
    process.stdout.write("\n");
    const rcon = new RCON(ip, parseInt(port), password);
    console.log("Connecting...");
    let cn = Date.now();
    await rcon.connect();
    console.clear();
    console.log("Connected! Took " + (Date.now() - cn) + " ms.");
    const processCommand = async () => {
        process.stdout.write("\n> ");
        const command = await ConsoleReader.readLine({show: true});
        const response = await rcon.send(command);
        console.log(response);
        setTimeout(processCommand);
    };
    processCommand().then(_ => _);
})();