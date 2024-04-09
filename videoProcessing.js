const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

ffmpeg.setFfmpegPath('C:\\Users\\Lenovo\\Downloads\\ffmpeg-6.1.1-full_build\\ffmpeg-6.1.1-full_build\\bin\\ffmpeg.exe');
ffmpeg.setFfprobePath('C:\\Users\\Lenovo\\Downloads\\ffmpeg-6.1.1-full_build\\ffmpeg-6.1.1-full_build\\bin\\ffprobe.exe');

function generateThumbnail(videoPath) {
  return new Promise((resolve, reject) => {
    const thumbnailPath = path.join(path.dirname(videoPath), 'thumbnail.png');

    ffmpeg(videoPath)
      .on('end', function() {
        resolve(thumbnailPath);
      })
      .on('error', function(err) {
        reject(err);
      })
      .screenshots({
        timestamps: ['50%'],
        filename: 'thumbnail.png',
        folder: path.dirname(videoPath),
        size: '320x240'
      });
  });
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, function(err, metadata) {
      if (err) {
        reject(err);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

module.exports = {
  generateThumbnail,
  getVideoDuration
};