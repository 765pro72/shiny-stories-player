const assetUrl = "/asset";
function spriteFromResource(resource) {
    // PIXI reads the @4x marker in the resource URL and assigns the correct
    // logical resolution. Scaling again here halves backgrounds and UI frames.
    return new PIXI.Sprite(resource.texture);
}
const usedFont = "theFont";
const zhcnFont = "AlimamaShuHeiTi";
const translate_master_list = "https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/story.json";
const translate_CSV_url = 'https://raw.githubusercontent.com/biuuu/ShinyColors/gh-pages/data/story/{uid}.csv';
const fontTimeout = 3000; // control font loading time 放弃字体加载超时时间
