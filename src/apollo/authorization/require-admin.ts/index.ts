import { ProducedContext } from "../../context";

export default function requireAdmin(context: ProducedContext): void {
  const { session } = context;

  if (!session) {
    throw new Error("Unauthorized.");
  }

  if (session) {
    if (session.role !== "ADMIN") {
      throw new Error("Unauthorized.");
    }
  }
}
