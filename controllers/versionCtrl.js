const getMinecraftVersions = async (req, res) => {
    try {
        const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest.json');
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();

        // Lọc các bản phát hành chính thức (release)
        const releaseVersions = data.versions
            .filter(v => v.type === 'release')
            .map(v => ({
                version: v.id,
                detailUrl: v.url, 
                releaseDate: v.releaseTime
            }));

        res.status(200).json({
            success: true,
            latest: data.latest.release, 
            versions: releaseVersions.slice(0, 40) // Lấy 40 bản gần nhất cho nhẹ
        });

    } catch (error) {
        console.error('[Version] Lỗi khi lấy danh sách phiên bản:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Không thể kết nối đến máy chủ Mojang' 
        });
    }
};

module.exports = {
    getMinecraftVersions
};