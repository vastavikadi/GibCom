import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { ai } from "@/lib/ai/provider";

async function main() {
  console.log("Testing ai.chat with Meta AI Muse-Spark-1.3");
  const res = await ai.chat([
    {
      role: "user",
      content:
        "In 15 words or fewer, explain why organisational memory is vital for engineering teams.",
    },
  ]);
  console.log("Model Used:", res.model);
  console.log("Response Content:", res.content);
  console.log("Tokens Used:", res.usage);
}

main().catch(console.error);
