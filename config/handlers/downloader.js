/**
 * SC-CPANEL VIP V5.5 - Downloader Handler
 * Commands: tiktok, ytdl, spotify/spo/spotifydl/playspotify, igdl, pinterest/pins
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { E, editReply } = require('./utils');

const DOWNLOADER_COMMANDS = [
  'tiktok', 'ytdl', 'spo', 'spotify', 'spotifydl', 'playspotify',
  'igdl', 'pinterest', 'pins',
];


async function handle(xy, { command, text, q, reply, InputFile, botToken, CatBox }) {

  // ======================== TIKTOK ========================
  if (command === 'tiktok') {
    if (!text || !text.includes('tiktok')) return reply(`<blockquote>${E.cross} <b>Link tidak valid!</b>\n${E.dot} Kirim link TikTok yang benar.</blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses TikTok...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const tiktok2 = require('../../src/lib/tiktok');
      const data = await tiktok2(text);
      if (data.no_watermark) await xy.api.sendVideo(xy.chat.id, data.no_watermark, { caption: `<blockquote>${E.fire} <b>TikTok - No Watermark</b>\n${E.dot} ${data.title || ''}</blockquote>`, parse_mode: 'HTML' });
      if (data.music?.startsWith('http')) {
        const ab = await axios.get(data.music, { responseType: 'arraybuffer' });
        await xy.api.sendAudio(xy.chat.id, new InputFile(Buffer.from(ab.data), 'audio.mp3'), { caption: `<blockquote>${E.sparkles} <b>Audio TikTok</b></blockquote>`, parse_mode: 'HTML' });
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>TikTok berhasil diunduh!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== YOUTUBE ========================
  if (command === 'ytdl') {
    const ytdl = require('@distube/ytdl-core');
    const ffmpeg = require('fluent-ffmpeg');
    if (!text || !ytdl.validateURL(text)) return reply(`<blockquote>${E.cross} <b>Link YouTube tidak valid!</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunduh YouTube...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const link = text;
      const videoPath = './yt_video.mp4', audioPath = './yt_audio.mp3';
      const info = await ytdl.getInfo(link);
      if (!info?.videoDetails) throw new Error('Gagal mengambil info video!');
      const { title, author } = info.videoDetails;
      await new Promise((resolve, reject) => { ytdl(link, { quality: 'highestvideo' }).pipe(fs.createWriteStream(videoPath)).on('finish', resolve).on('error', reject); });
      await new Promise((resolve, reject) => { ffmpeg(ytdl(link, { quality: 'highestaudio' })).audioCodec('libmp3lame').save(audioPath).on('end', resolve).on('error', reject); });
      await xy.api.sendAudio(xy.chat.id, await CatBox(audioPath), { caption: `<blockquote>${E.sparkles} <b>Audio YouTube</b>\n${E.dot} ${title}</blockquote>`, parse_mode: 'HTML' });
      await xy.api.sendVideo(xy.chat.id, await CatBox(videoPath), { caption: `<blockquote>${E.fire} <b>Video YouTube</b>\n${E.dot} ${title}\n${E.dot} ${author.name}</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(videoPath); fs.unlinkSync(audioPath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>YouTube berhasil diunduh!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== SPOTIFY ========================
  if (['spo', 'spotify', 'spotifydl', 'playspotify'].includes(command)) {
    if (!q || !q.includes('spotify.com')) return reply(`<blockquote>${E.cross} <b>URL Spotify tidak valid!</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mengunduh Spotify...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const res = await fetch(`https://api.nekorinn.my.id/downloader/spotify?url=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!data.status) throw new Error('Lagu tidak ditemukan!');
      const { title, artist, downloadUrl } = data.result;
      const filePath = path.join('./temp', `${title.replace(/[^\w\s]/gi, '')}.mp3`);
      if (!fs.existsSync('./temp')) fs.mkdirSync('./temp', { recursive: true });
      const response = await axios({ method: 'GET', url: downloadUrl, responseType: 'stream' });
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
      await xy.api.sendAudio(xy.chat.id, new InputFile(filePath), { caption: `<blockquote>${E.sparkles} <b>${title}</b>\n${E.dot} ${artist}</blockquote>`, parse_mode: 'HTML' });
      fs.unlinkSync(filePath);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Spotify berhasil diunduh!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== INSTAGRAM ========================
  if (command === 'igdl') {
    if (!text || !text.includes('instagram.com/')) return reply(`<blockquote>${E.cross} <b>Link Instagram tidak valid!</b></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses Instagram...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const { igdl } = require('btch-downloader');
      const data = await igdl(text);
      if (!data?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Tidak ditemukan.</b></blockquote>`);
      let sent = 0;
      for (const item of data) {
        if (!item.url) continue;
        const filePath = `./igmedia.${item.url.includes('video') ? 'mp4' : 'jpg'}`;
        const response = await axios({ url: item.url, method: 'GET', responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        const uploadedUrl = await CatBox(filePath);
        if (item.url.includes('video')) await xy.api.sendVideo(xy.chat.id, uploadedUrl, { caption: `<blockquote>${E.fire} <b>Video IG</b></blockquote>`, parse_mode: 'HTML' });
        else await xy.api.sendPhoto(xy.chat.id, uploadedUrl, { caption: `<blockquote>${E.sparkles} <b>Foto IG</b></blockquote>`, parse_mode: 'HTML' });
        fs.existsSync(filePath) && fs.unlinkSync(filePath);
        sent++;
      }
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>${sent} file berhasil diunduh!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }

  // ======================== PINTEREST ========================
  if (command === 'pinterest' || command === 'pins') {
    if (!text) return reply(`<blockquote>${E.cross} Format: <code>/${command} kata kunci</code></blockquote>`, { parse_mode: 'HTML' });
    const sentMessage = await reply(`<blockquote>${E.bolt} <b>Mencari gambar Pinterest...</b></blockquote>`, { parse_mode: 'HTML' });
    try {
      const pinterest = require('../../src/lib/pinterest');
      let images = await pinterest(text);
      if (!images?.length) return editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Tidak ditemukan.</b></blockquote>`);
      images = images.sort(() => Math.random() - 0.5).slice(0, 5);
      for (const url of images) await xy.api.sendPhoto(xy.chat.id, url, { caption: `<blockquote>${E.sparkles} <b>Pinterest:</b> ${text}</blockquote>`, parse_mode: 'HTML' });
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Pinterest berhasil!</b></blockquote>`);
    } catch (err) { await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal:</b> ${err.message}</blockquote>`); }
    return;
  }
}

module.exports = { commands: DOWNLOADER_COMMANDS, handle };
