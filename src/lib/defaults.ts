import * as os from "os";
import * as path from "path";

export const storagePath = path.join(os.tmpdir(), "verdaccio-storage");
