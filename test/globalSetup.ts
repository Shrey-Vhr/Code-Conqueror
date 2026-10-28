import fs from "fs";
import path from "path";

export default function globalSetup() {
  const prismaDir = path.resolve(__dirname, "../prisma");
  const devDb = path.join(prismaDir, "dev.db");
  const testDb = path.join(prismaDir, "test.db");

  if (fs.existsSync(devDb)) {
    fs.copyFileSync(devDb, testDb);
  }

  return () => {
    if (fs.existsSync(testDb)) {
      try {
        fs.unlinkSync(testDb);
      } catch {
        // Ignore if locked
      }
    }
  };
}
