/**
 * SC-CPANEL VIP V5.5 - AI Handler
 * Commands: ai, gpt, nekogpt, aiimg, aimusic, brat, voiceai, aivid
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const { E, editReply } = require('./utils');

const AI_COMMANDS = ['ai', 'gpt', 'nekogpt', 'aivid', 'aiimg', 'aimusic', 'brat', 'voiceai'];

async function handle(xy, { command, q, reply, InputFile, CatBox }) {
  if (!q) return reply(`<blockquote>${E.cross} <b>Masukkan teks!</b>\n${E.dot} Contoh: <code>/${command} pertanyaan kamu</code></blockquote>`, { parse_mode: 'HTML' });

  const sentMessage = await reply(`<blockquote>${E.bolt} <b>Memproses AI...</b></blockquote>`, { parse_mode: 'HTML' });

  try {
    // GPT / AI Chat
    if (['ai', 'gpt', 'nekogpt'].includes(command)) {
      const res = await fetch(`https://api.nekorinn.my.id/ai/gpt-4.1-mini?text=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data?.result) {
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.sparkles} <b>AI Response</b>\n\n${data.result}</blockquote>`);
      } else {
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>AI tidak merespons.</b></blockquote>`);
      }
      return;
    }

    // AI Image
    if (command === 'aiimg') {
      await xy.replyWithPhoto(
        `https://api.nekorinn.my.id/ai-img/ai4chat?text=${encodeURIComponent(q)}&ratio=16%3A9`,
        { caption: `<blockquote>${E.sparkles} <b>AI Image</b>\n${E.dot} ${q}</blockquote>`, parse_mode: 'HTML' }
      );
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Gambar AI berhasil!</b></blockquote>`);
      return;
    }

    // AI Music
    if (command === 'aimusic') {
      const genmusic = require('../../src/lib/aimusic');
      const result = await genmusic(q);
      if (result?.[0]?.audio_url) {
        const fp = path.join(__dirname, 'music_ai.mp3');
        const res = await axios.get(result[0].audio_url, { responseType: 'stream' });
        const writer = fs.createWriteStream(fp);
        res.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        await xy.api.sendAudio(xy.chat.id, await CatBox(fp), { caption: `<blockquote>${E.sparkles} <b>${result[0].title || 'AI Music'}</b></blockquote>`, parse_mode: 'HTML' });
        fs.unlinkSync(fp);
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>AI Music berhasil!</b></blockquote>`);
      } else {
        await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>Gagal generate musik.</b></blockquote>`);
      }
      return;
    }

    // Brat
    if (command === 'brat') {
      const fp = './tmp_brat.png';
      const res = await axios.get(`https://api.hanggts.xyz/imagecreator/brat?text=${encodeURIComponent(q)}`, { responseType: 'arraybuffer' });
      fs.writeFileSync(fp, res.data);
      await xy.api.sendSticker(xy.chat.id, new InputFile(fp));
      fs.unlinkSync(fp);
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.check} <b>Brat berhasil!</b></blockquote>`);
      return;
    }

    // Voice AI / AI Video - placeholder
    if (command === 'voiceai' || command === 'aivid') {
      await editReply(xy, sentMessage.message_id, `<blockquote>${E.star} <b>Fitur ${command.toUpperCase()}</b> sedang dalam pengembangan.</blockquote>`);
      return;
    }

  } catch (err) {
    await editReply(xy, sentMessage.message_id, `<blockquote>${E.cross} <b>AI Error:</b> ${err.message}</blockquote>`);
  }
}

module.exports = { commands: AI_COMMANDS, handle };
