import fs from "fs";
import path from "path";

describe("release path blocking ownership", ()=>{
    test("App bootstrap does not import legacy RN blocking owners", ()=>{
        const appSource = fs.readFileSync(
            path.join(__dirname, "..", "App.tsx"),
            "utf8"
        );

        expect(appSource).not.toMatch(/QuizScreen/);
        expect(appSource).not.toMatch(/QuizService/);
        expect(appSource).not.toMatch(/BackgroundService/);
        expect(appSource).not.toMatch(/QuizRequired|TimerUpdate|ForegroundAppChanged/);
        expect(appSource).toMatch(/DetectorService\s*\.resumePendingStart/);
    });
});
