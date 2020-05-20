import * as crypto from "crypto";

// Hash something in an insecure (but unique & fast) manner for stuff like
// checking duplicates. For secure hashes, use bcrypt.
export function insecureHash(data: string | Buffer | DataView): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export default insecureHash;
