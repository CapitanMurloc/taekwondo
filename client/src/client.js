class Client {

    constructor() {
        this.socket = {};
        this.isConnect = false;
    }

    connect() {
        try {

            this.socket = new WebSocket("ws://localhost:8050");
            this.isConnect = true;

            this.socket.addEventListener("open", () => {
                const event = {
                    id: "Frontal", // identifier of view Frontal, Back, etc.
                    type: "init"
                }

                this.socket.send(JSON.stringify(event));
            });

            // this.socket.addEventListener("message", async ({data}) => {
            //
            //     let myData = JSON.parse(data);
            //
            //     if (myData.type == "answer") {
            //         const answer = myData.answer;
            //         // await processAnswer(answer);
            //     }
            //
            //     if (myData.type == "inference") {
            //         const inference = myData.inference;
            //         // txtInference.value += inference + "\n";
            //     }
            // });

        } catch (error) {
            console.error(`Failed to create connection: ${error}`);
        }
    }

    send_pose(poseWorldLandmarks) {
        try {
            if (this.isConnect) {
                const event = {
                    id: "Frontal", // identifier of view Frontal, Back, etc.
                    type: "pose",
                    poses: poseWorldLandmarks
                }
                this.socket.send(JSON.stringify(event));
            }
        } catch (error) {
            console.error(`Failed to send pose: ${error}`);
        }
    }
}

export let client = new Client();