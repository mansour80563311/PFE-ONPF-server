import fs from "node:fs/promises";

export async function removeFileIfExists(
  filePath: string
): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== "ENOENT") {
      console.error(
        `Impossible de supprimer le fichier ${filePath}`,
        error
      );
    }
  }
}