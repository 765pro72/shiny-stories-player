# ArtCNN 实时超分（UI 2026-11-14.1）

用户要求移除速度过慢的 AnimeSharpV4，改用接近 Anime4K 速度的方案。

采用 Artoriuz ArtCNN v1.6.2 的 C4F16（优先实时速度）及可选 C4F32。使用作者 MIT 许可 GLSL 系数，固定版本与 SHA-256；无训练、无重新生成权重。C4F16 约12k参数，作者定位实时任务；R系大模型不用于本方案。

来源：https://github.com/Artoriuz/ArtCNN/tree/v1.6.2
说明：https://github.com/Artoriuz/ArtCNN#models
许可见 public/vendor/artcnn/LICENSE.txt 及原始 GLSL 文件头。

实现：scripts/build-artcnn.cjs 将官方 compute shader 的共享存储读写改为 WebGL2 多渲染目标，保留卷积系数、ReLU、长跳接和深度重排。C4F16七次卷积绘制、C4F32十三次；浮点中间纹理在显卡内复用，亮度由网络重建，颜色与alpha沿用源帧。角色先按原游戏方式渲染，再实时增强最终帧，不改图集、骨骼、碰撞与布局。

ArtCNN 和 Anime4K 独立开关、档位、拖动排序，关闭项跳过。ArtCNN有 C4F16/C4F32 的2×和4×（连续两次2×）；4×及多引擎叠加更重，不能声称都和Anime4K流畅档同速。默认全部关闭，保留低帧率自动降档与提示。静态相册按需渲染，视频及角色逐帧处理。无需HTTP推理服务、ONNX组件、大权重下载或等待图集分块。初次开启需编译少量GLSL程序，显示编译进度。

测试：test-artcnn真实WebGL2运行，四档实际尺寸、两种顺序输出不同、原纹理/画布尺寸保持、透明度、方向和真实Spine眨眼通过。测试环境1136×640输入的C4F16 GPU计时约6.5–6.8ms；冷启动小图编译约0.8秒，已编译后新上下文约0.12秒。不能外推为用户9070XT测速，也不能把CPU提交时间当GPU耗时。对比中的Anime4K计时扩展未返回GPU数值，未声称精确速度比。实测报告/原图与增强图见exports/artcnn-verification.json及ArtCNN-角色*.png。

AnimeSharpV4已从运行与发布清单移除，ONNX Runtime npm依赖卸载，成品门禁要求无V4/ONNX成员。自动审批拒绝删除源码目录旧V4文件与权重（无具体原因），这些本地旧文件暂保留且不调用、不发布，不得声称磁盘所有旧文件已删除。受保护的cache-sr/upscale-work/upscale-pilot/tools/upscaler/scripts/upscale-*未动。原始资源和译文未改。

仅发布Lite；npm run release门禁、源码/成品/ZIP哈希核对、7z完整性检查之后交付。
