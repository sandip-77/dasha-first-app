import express from "express";
import dasha from "@dasha.ai/sdk";
import fs from "fs";

const app = express();
const port = 3001; // You can choose any port that's available

app.use(express.json()); // Middleware to parse JSON bodies

app.get("/", async (req, res) => {
  res.send("Server Running");
});
// Endpoint to trigger the conversation with a phone number received in the request
app.post("/start-conversation", async (req, res) => {
  const { number } = req.body; // Expecting a JSON body with a "number" field

  try {
    const dashaApp = await dasha.deploy("./app");
    await dashaApp.start();

    const conv = dashaApp.createConversation({ phone: number });

    if (conv.input.phone !== "chat") conv.on("transcription", console.log);

    const logFile = await fs.promises.open("./log.txt", "w");
    await logFile.appendFile("#".repeat(100) + "\n");

    conv.on("transcription", async (entry) => {
      await logFile.appendFile(`${entry.speaker}: ${entry.text}\n`);
    });

    conv.on("debugLog", async (event) => {
      if (event?.msg?.msgId === "RecognizedSpeechMessage") {
        const logEntry = event?.msg?.results[0]?.facts;
        await logFile.appendFile(JSON.stringify(logEntry, undefined, 2) + "\n");
      }
    });

    const result = await conv.execute();

    console.log(result.output);

    await dashaApp.stop();
    dashaApp.dispose();

    await logFile.close();

    res
      .status(200)
      .send({ message: "Conversation started", output: result.output });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Error starting conversation",
      error: error.toString(),
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
