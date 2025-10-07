import { io } from "socket.io-client";

const BASE = "http://localhost:4000";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const alice = io(BASE, { query: { userId: "alice" } });
  const bob = io(BASE, { query: { userId: "bob" } });

  alice.on("connect", () => console.log("alice connected", alice.id));
  bob.on("connect", () => console.log("bob connected", bob.id));

  bob.on("receiveMessage", (msg) => console.log("bob received:", msg));
  alice.on("receiveMessage", (msg) => console.log("alice received:", msg));

  await wait(1000);
  console.log("alice sending message to bob via socket");
  alice.emit("sendMessage", {
    receiverId: "bob",
    text: "hello bob",
    image: null,
  });

  await wait(1000);
  alice.disconnect();
  bob.disconnect();
}

run().catch((e) => console.error(e));
