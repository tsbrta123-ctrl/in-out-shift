// ██████████████████████████████████████████████████████████████████████████████
// ██                                                                            ██
// ██   แก้เครดิตขอให้พ่อมึงตายแม่มึงเป็นกระหรี่                               ██
// ██                                                                            ██
// ██   Code By  : WashiX & Vapark                                               ██
// ██   Build    : ©2026 WashiX The Dev Community                                ██
// ██   License  : ใช้ได้ แก้ได้ แจกให้ใส่เครดิต / ขายได้ห้ามแก้เครดิต        ██
// ██                                                                            ██
// ██████████████████████████████████████████████████████████████████████████████

'use strict';

// ══════════════════════════════════════════════════════════════════════════════
//  📦  IMPORTS
// ══════════════════════════════════════════════════════════════════════════════

const {
    Client,
    ActivityType,
    GatewayIntentBits,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events,
    SlashCommandBuilder,
    ComponentType,
    ChannelType,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const moment   = require('moment-timezone');
const cron     = require('node-cron');
const express  = require('express');
const fs       = require('fs');

require('dotenv').config();

console.log('TOKEN STATUS:', process.env.DISCORD_TOKEN ? 'พบ Token แล้ว' : 'ยังไม่พบ Token (undefined)');
// ══════════════════════════════════════════════════════════════════════════════
//  ⚙️  CONFIG
// ══════════════════════════════════════════════════════════════════════════════

const API_PORT   = 3000;
const API_SECRET = process.env.API_SECRET || 'washix-secret-2026';

const GALLERY_IMAGES = {
    banner:      'https://cdn.discordapp.com/attachments/1422474011706785903/1434045800094105630/IMG_5189.gif?ex=698eb13a&is=698d5fba&hm=4f24776effc468e6311db8fcba3d28336dc91103e451828dbea67424b6cda647&',
    checkIn:     'https://s13.gifyu.com/images/bvyxc.png',
    checkOut:    'https://s12.gifyu.com/images/bvHMg.jpg',
    leaderboard: 'https://s13.gifyu.com/images/bvG3W.png',
    mvp:         'https://s12.gifyu.com/images/bvHMc.jpg',
    trophy:      'https://cdn.discordapp.com/attachments/1422474011706785903/1459664165470736426/Other_World_5.jpg?ex=698ef270&is=698da0f0&hm=a919d927f06ecec80dd3eb4a31d9362097078af0284f240e2a6d4a8b1389c724&',
    stats:       'https://s13.gifyu.com/images/bvG3W.png',
    success:     'https://cdn.discordapp.com/attachments/1422474011706785903/1434045800094105630/IMG_5189.gif?ex=698eb13a&is=698d5fba&hm=4f24776effc468e6311db8fcba3d28336dc91103e451828dbea67424b6cda647&',
};

// ══════════════════════════════════════════════════════════════════════════════
//  🗄️  DATABASE  —  สร้างใหม่อัตโนมัติ ไม่ต้องรัน setup แยก
// ══════════════════════════════════════════════════════════════════════════════

let db;
const DB_FILE = './work_pro.db';

async function initDB() {
    const isNew = !fs.existsSync(DB_FILE);
    db = await open({ filename: DB_FILE, driver: sqlite3.Database });

    await db.exec(`
        PRAGMA journal_mode = DELETE;
        PRAGMA foreign_keys = OFF;

        CREATE TABLE IF NOT EXISTS config (
            guild_id    TEXT     PRIMARY KEY,
            menu_ch     TEXT     NOT NULL,
            log_ch      TEXT     NOT NULL,
            notify_ch   TEXT     NOT NULL,
            created_at  DATETIME DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS attendance (
            id                INTEGER  PRIMARY KEY AUTOINCREMENT,
            user_id           TEXT     NOT NULL,
            user_name         TEXT     NOT NULL,
            check_in_time     DATETIME,
            check_out_time    DATETIME,
            duration_minutes  INTEGER  DEFAULT 0,
            status            TEXT     DEFAULT 'Working',
            season            TEXT,
            note              TEXT     DEFAULT ''
        );

        CREATE TABLE IF NOT EXISTS mvp_stats (
            user_id    TEXT     PRIMARY KEY,
            user_name  TEXT     NOT NULL,
            wins       INTEGER  DEFAULT 0,
            last_win   TEXT     DEFAULT ''
        );

        CREATE INDEX IF NOT EXISTS idx_attendance_user   ON attendance (user_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_season ON attendance (season);
        CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance (status);
    `);

    const pink  = '\x1b[35m';
    const green = '\x1b[32m';
    const reset = '\x1b[0m';

    if (isNew) console.log(`${green}✅ สร้างฐานข้อมูลใหม่ work_pro.db สำเร็จ!${reset}`);
    else       console.log(`${pink}📦 โหลดฐานข้อมูล work_pro.db สำเร็จ${reset}`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  🤖  DISCORD CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
    ],
});

// ══════════════════════════════════════════════════════════════════════════════
//  📊  MEMBER STATS
// ══════════════════════════════════════════════════════════════════════════════

const getMemberStats = () => {
    const guild = client.guilds.cache.first();
    if (!guild) return { online: 0, offline: 0, total: 0 };

    const total  = guild.memberCount;
    const online = guild.members.cache.filter(m =>
        m.presence?.status === 'online' ||
        m.presence?.status === 'dnd'    ||
        m.presence?.status === 'idle'
    ).size;

    return { online, offline: total - online, total };
};

// ══════════════════════════════════════════════════════════════════════════════
//  🛠️  HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function makeSimpleContainer(title, body, image = null) {
    const c = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## **${title}**\n\n${body}\n\n`)
    );

    if (image) {
        c.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems([{ media: { url: image } }])
        );
    }

    c.addSeparatorComponents(new SeparatorBuilder());
    return c;
}

const isAdmin = (member) => member.permissions.has(PermissionFlagsBits.Administrator);

// ══════════════════════════════════════════════════════════════════════════════
//  📋  SLASH COMMANDS  +  BOT READY
// ══════════════════════════════════════════════════════════════════════════════

client.on(Events.ClientReady, async () => {

    // ── Command Definitions ────────────────────────────────────────────────────

    const commands = [

        // /config-system
        new SlashCommandBuilder()
            .setName('config-system')
            .setDescription('ตั้งค่าห้องระบบทั้งหมด')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addChannelOption(o => o
                .setName('menu')
                .setDescription('ห้องวางปุ่มเมนู')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addChannelOption(o => o
                .setName('logs')
                .setDescription('ห้องเก็บประวัติ (Logs)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addChannelOption(o => o
                .setName('notify')
                .setDescription('ห้องประกาศสรุปผลรายเดือน')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            ),

        // /leaderboard
        new SlashCommandBuilder()
            .setName('leaderboard')
            .setDescription('ดูอันดับเวลาทำงานประจำเดือนนี้'),

        // /mvp-book
        new SlashCommandBuilder()
            .setName('mvp-book')
            .setDescription('สมุดรายชื่อผู้ได้รับ MVP'),

        // /admin-db
        new SlashCommandBuilder()
            .setName('admin-db')
            .setDescription('🔐 [Admin Only] จัดการฐานข้อมูล')
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
            .addSubcommand(sub => sub
                .setName('view-attendance')
                .setDescription('ดูประวัติการเข้างาน')
                .addStringOption(o => o
                    .setName('season')
                    .setDescription('เดือน YYYY-MM (ไม่ใส่ = เดือนนี้)')
                    .setRequired(false)
                )
                .addUserOption(o => o
                    .setName('user')
                    .setDescription('กรองตามผู้ใช้')
                    .setRequired(false)
                )
                .addStringOption(o => o
                    .setName('status')
                    .setDescription('กรอง status')
                    .addChoices(
                        { name: 'ทั้งหมด',               value: 'ALL'      },
                        { name: 'กำลังทำงาน (Working)',  value: 'Working'  },
                        { name: 'เสร็จสิ้น (Finished)',  value: 'Finished' },
                        { name: 'ผิดปกติ (Invalid)',      value: 'Invalid'  },
                    )
                    .setRequired(false)
                )
            )
            .addSubcommand(sub => sub
                .setName('edit-checkin')
                .setDescription('แก้ไขเวลาเข้างาน')
                .addIntegerOption(o => o
                    .setName('record-id')
                    .setDescription('ID (ดูจาก view-attendance)')
                    .setRequired(true)
                )
                .addStringOption(o => o
                    .setName('time')
                    .setDescription('เวลาใหม่ YYYY-MM-DD HH:mm')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('edit-checkout')
                .setDescription('แก้ไขเวลาออกงาน')
                .addIntegerOption(o => o
                    .setName('record-id')
                    .setDescription('ID ของ record')
                    .setRequired(true)
                )
                .addStringOption(o => o
                    .setName('time')
                    .setDescription('เวลาใหม่ YYYY-MM-DD HH:mm')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('delete-record')
                .setDescription('ลบ record ออกจาก DB')
                .addIntegerOption(o => o
                    .setName('record-id')
                    .setDescription('ID ที่จะลบ')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('force-checkout')
                .setDescription('บังคับ checkout ให้ผู้ใช้ที่ค้างอยู่')
                .addUserOption(o => o
                    .setName('user')
                    .setDescription('ผู้ใช้')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('add-time')
                .setDescription('เพิ่มเวลาทำงาน manual')
                .addUserOption(o => o
                    .setName('user')
                    .setDescription('ผู้ใช้')
                    .setRequired(true)
                )
                .addIntegerOption(o => o
                    .setName('minutes')
                    .setDescription('จำนวนนาที')
                    .setRequired(true)
                )
                .addStringOption(o => o
                    .setName('note')
                    .setDescription('หมายเหตุ')
                    .setRequired(false)
                )
            )
            .addSubcommand(sub => sub
                .setName('view-mvp')
                .setDescription('ดูสถิติ MVP ทั้งหมด')
            )
            .addSubcommand(sub => sub
                .setName('edit-mvp')
                .setDescription('แก้ไขจำนวน MVP wins')
                .addUserOption(o => o
                    .setName('user')
                    .setDescription('ผู้ใช้')
                    .setRequired(true)
                )
                .addIntegerOption(o => o
                    .setName('wins')
                    .setDescription('จำนวน wins ใหม่')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('db-stats')
                .setDescription('ดูสถิติภาพรวม Database')
            ),
    ];

    // ── Register Commands ──────────────────────────────────────────────────────

    const guild = client.guilds.cache.get(process.env.GUILD_ID);

    if (guild) {
        await guild.commands.set([]);
        await client.application.commands.set([]);
        await guild.commands.set(commands);
    } else {
        console.warn(`⚠️ ไม่พบ Guild ID: ${process.env.GUILD_ID} — fallback ไปใช้ global commands`);
        await client.application.commands.set([]);
        await client.application.commands.set(commands);
    }

    // ── Ready Log ─────────────────────────────────────────────────────────────

    const pink  = '\x1b[35m';
    const reset = '\x1b[0m';

    console.log(`${pink}💖 น้อง ${client.user.username} มาเข้างานแล้วน้าาาา! พร้อมดูแลทุกคนแล้วงับ!${reset}`);
    console.log(`${pink}🌐 REST API → http://localhost:${API_PORT}/api${reset}`);
    console.log(`${pink}✅ Reset Commands OK${reset}`);

    // ── Presence Rotation  (เริ่มหลัง bot ready เท่านั้น) ─────────────────────

    setInterval(() => {
        const stats = getMemberStats();
        const activities = [
            { name: `🟢 Online: ${stats.online} คน`,        type: ActivityType.Watching   },
            { name: `⚪ Offline: ${stats.offline} คน`,       type: ActivityType.Watching   },
            { name: `👥 สมาชิกทั้งหมด: ${stats.total} คน`, type: ActivityType.Competing  },
            { name: '💖 ดูแลทุกคนอย่างดีงับ',               type: ActivityType.Playing    },
            { name: '⚖️ ©dew | ©2026',                       type: ActivityType.Listening  },
        ];

        client.user.setPresence({
            activities: [activities[Math.floor(Math.random() * activities.length)]],
            status: 'dnd',
        });
    }, 10_000);
});

// ══════════════════════════════════════════════════════════════════════════════
//  ⚡  INTERACTION HANDLER
// ══════════════════════════════════════════════════════════════════════════════

client.on(Events.InteractionCreate, async (interaction) => {

    // ── Slash Commands ─────────────────────────────────────────────────────────

    if (interaction.isChatInputCommand()) {
        const { commandName, guildId, options } = interaction;

        // ── /config-system ────────────────────────────────────────────────────

        if (commandName === 'config-system') {
            if (!isAdmin(interaction.member)) {
                return interaction.reply({
                    content:   '<a:1022153572571422831:1491123828049580164> ต้องเป็น Administrator เท่านั้น',
                    ephemeral: true,
                });
            }

            const mCh = options.getChannel('menu');
            const lCh = options.getChannel('logs');
            const nCh = options.getChannel('notify');

            await db.run(
                `INSERT OR REPLACE INTO config (guild_id, menu_ch, log_ch, notify_ch) VALUES (?, ?, ?, ?)`,
                [guildId, mCh.id, lCh.id, nCh.id]
            );

            const menu = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## **<a:1047563066713309316:1491123428655366407> ระบบบันทึกเวลาปฏิบัติงาน <a:btCheckBlack:1491362638289174528>**\n\n` +
                        `\`\`\`ยินดีต้อนรับ! กรุณากดปุ่มด้านล่างเพื่อบันทึกเวลาเข้าหรือออกงาน\`\`\`\n` +
                        `**<a:1047563066713309316:1491123428655366407> คำแนะนำ**\n` +
                        `<a:702045669044650015:1491121679303442543> **ลงชื่อเข้างาน (Check In)** - เริ่มต้นการนับเวลาทำงาน <:970129525218365511:1491357310323523644>\n` +
                        `<a:702045683087048704:1491121705777889550> **ลงชื่อออกงาน (Check Out)** - สิ้นสุดการนับเวลาทำงานและคำนวณเวลา <:970129580390244412:1491357391290237008>\n\n`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.banner } }])
                )
                .addSeparatorComponents(new SeparatorBuilder())
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`*ระบบบริหารจัดการเวลาอัตโนมัติ*\n\n`)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('work_in')
                            .setLabel('ลงชื่อเข้างาน')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('<a:702045669044650015:1491121679303442543>'),
                        new ButtonBuilder()
                            .setCustomId('work_out')
                            .setLabel('ลงชื่อออกงาน')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('<a:702045683087048704:1491121705777889550>'),
                    )
                );

            await mCh.send({ components: [menu], flags: MessageFlags.IsComponentsV2 });

            return interaction.reply({
                components: [makeSimpleContainer(
                    '<a:btCheckBlack:1491362638289174528> Success',
                    'ตั้งค่าระบบและส่งเมนูเรียบร้อยแล้ว!',
                    GALLERY_IMAGES.success
                )],
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            });
        }

        // ── /leaderboard ──────────────────────────────────────────────────────

        if (commandName === 'leaderboard') {
            const season = moment().tz('Asia/Bangkok').format('YYYY-MM');
            const stats  = await db.all(
                `SELECT user_id, user_name, SUM(duration_minutes) as total
                 FROM attendance
                 WHERE status = "Finished" AND season = ?
                 GROUP BY user_id
                 ORDER BY total DESC
                 LIMIT 5000`,
                [season]
            );

            let content = `## **:calendar_spiral: อันดับคนขยันประจำเดือน ${moment().format('MMMM YYYY')}**\n\n`;

            if (stats.length) {
                stats.forEach((s, i) => {
                    content += `\`${i + 1}\` <@${s.user_id}> • ${Math.floor(s.total / 60)} ชม. ${s.total % 60} นาที\n`;
                });
            } else {
                content += `*ยังไม่มีข้อมูลในเดือนนี้*\n`;
            }
            content += '\n';

            return interaction.reply({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.leaderboard } }])
                        )
                        .addSeparatorComponents(new SeparatorBuilder()),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // ── /mvp-book ─────────────────────────────────────────────────────────

        if (commandName === 'mvp-book') {
            const mvps = await db.all('SELECT * FROM mvp_stats ORDER BY wins DESC');

            let content = `## **<a:958372956059353158:1491122704999387299> สมุดเกียรติยศ (MVP Hall of Fame)**\n\n`;

            if (mvps.length) {
                mvps.forEach(m => {
                    content += `<a:958372956059353158:1491122704999387299> <@${m.user_id}> — ได้รับรางวัล \`${m.wins} สมัย\`\n`;
                });
            } else {
                content += `*ยังไม่มีประวัติรายชื่อ*\n`;
            }
            content += '\n';

            return interaction.reply({
                components: [
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content))
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.mvp } }])
                        )
                        .addSeparatorComponents(new SeparatorBuilder()),
                ],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        // ── /admin-db ─────────────────────────────────────────────────────────

        if (commandName === 'admin-db') {
            if (!isAdmin(interaction.member)) {
                return interaction.reply({
                    content:   '<a:1022153572571422831:1491123828049580164> คำสั่งนี้สำหรับ Administrator เท่านั้น',
                    ephemeral: true,
                });
            }

            await interaction.deferReply({ ephemeral: true });
            const sub = options.getSubcommand();

            // view-attendance ──────────────────────────────────────────────────

            if (sub === 'view-attendance') {
                const season    = options.getString('season') || moment().tz('Asia/Bangkok').format('YYYY-MM');
                const targetUser = options.getUser('user');
                const statusOpt = options.getString('status') || 'ALL';

                let query    = `SELECT * FROM attendance WHERE season = ?`;
                const args   = [season];

                if (targetUser)       { query += ` AND user_id = ?`; args.push(targetUser.id); }
                if (statusOpt !== 'ALL') { query += ` AND status = ?`; args.push(statusOpt); }

                query += ` ORDER BY id DESC LIMIT 20`;

                const rows = await db.all(query, args);

                let content = `## **:open_file_folder: ประวัติการเข้างาน — ${season}**\n`;
                if (targetUser) content += `:bust_in_silhouette: User: ${targetUser.username}\n`;
                content += `:bar_chart: Status: ${statusOpt}\n\n`;

                if (!rows.length) {
                    content += `*ไม่มีข้อมูล*\n`;
                } else {
                    rows.forEach(r => {
                        const inT = r.check_in_time
                            ? moment(r.check_in_time).tz('Asia/Bangkok').format('DD/MM HH:mm') : '-';
                        const outT = r.check_out_time
                            ? moment(r.check_out_time).tz('Asia/Bangkok').format('DD/MM HH:mm') : '-';
                        const dur = r.duration_minutes
                            ? `${Math.floor(r.duration_minutes / 60)}ชม.${r.duration_minutes % 60}น.` : '-';

                        content += `\`ID:${r.id}\` **${r.user_name}**\n`;
                        content += `└ เข้า: \`${inT}\` ออก: \`${outT}\` รวม: \`${dur}\` [${r.status}]\n`;
                        if (r.note) content += `└ :dividers: ${r.note}\n`;
                        content += '\n';
                    });
                    content += `*(แสดงสูงสุด 20 รายการ ดูเพิ่มผ่าน API)*`;
                }

                return interaction.editReply({
                    components: [makeSimpleContainer(':dividers: ML — ประวัติการเข้างาน', content)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // edit-checkin ─────────────────────────────────────────────────────

            if (sub === 'edit-checkin') {
                const id      = options.getInteger('record-id');
                const timeStr = options.getString('time');
                const parsed  = moment.tz(timeStr, 'YYYY-MM-DD HH:mm', 'Asia/Bangkok');

                if (!parsed.isValid()) {
                    return interaction.editReply({ content: '<a:702045683087048704:1491121705777889550> รูปแบบผิด! ใช้ YYYY-MM-DD HH:mm' });
                }

                const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [id]);
                if (!row) return interaction.editReply({ content: `<a:702045683087048704:1491121705777889550> ไม่พบ record ID ${id}` });

                await db.run(`UPDATE attendance SET check_in_time = ? WHERE id = ?`, [parsed.format(), id]);

                if (row.check_out_time) {
                    const nd = Math.round(moment.duration(moment(row.check_out_time).diff(parsed)).asMinutes());
                    await db.run(
                        `UPDATE attendance SET duration_minutes = ?, status = ? WHERE id = ?`,
                        [Math.max(nd, 0), (nd > 0 && nd <= 1500) ? 'Finished' : 'Invalid', id]
                    );
                }

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:btCheckBlack:1491362638289174528> แก้ไขเวลาเข้างานสำเร็จ',
                        `ID \`${id}\` เวลาเข้าใหม่: \`${parsed.format('DD/MM/YYYY HH:mm')}\`\nโดย: ${interaction.user.username}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // edit-checkout ────────────────────────────────────────────────────

            if (sub === 'edit-checkout') {
                const id      = options.getInteger('record-id');
                const timeStr = options.getString('time');
                const parsed  = moment.tz(timeStr, 'YYYY-MM-DD HH:mm', 'Asia/Bangkok');

                if (!parsed.isValid()) {
                    return interaction.editReply({ content: '<a:702045683087048704:1491121705777889550> รูปแบบผิด! ใช้ YYYY-MM-DD HH:mm' });
                }

                const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [id]);
                if (!row) return interaction.editReply({ content: `<a:702045683087048704:1491121705777889550> ไม่พบ record ID ${id}` });

                const nd = Math.round(moment.duration(parsed.diff(moment(row.check_in_time))).asMinutes());
                const ns = (nd > 0 && nd <= 1500) ? 'Finished' : 'Invalid';

                await db.run(
                    `UPDATE attendance SET check_out_time = ?, duration_minutes = ?, status = ? WHERE id = ?`,
                    [parsed.format(), Math.max(nd, 0), ns, id]
                );

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:btCheckBlack:1491362638289174528> แก้ไขเวลาออกงานสำเร็จ',
                        `ID \`${id}\` เวลาออกใหม่: \`${parsed.format('DD/MM/YYYY HH:mm')}\`` +
                        `\nรวม: \`${Math.floor(Math.max(nd, 0) / 60)} ชม. ${Math.max(nd, 0) % 60} นาที\`` +
                        `\nโดย: ${interaction.user.username}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // delete-record ────────────────────────────────────────────────────

            if (sub === 'delete-record') {
                const id  = options.getInteger('record-id');
                const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [id]);

                if (!row) return interaction.editReply({ content: `<a:702045683087048704:1491121705777889550> ไม่พบ record ID ${id}` });

                await db.run(`DELETE FROM attendance WHERE id = ?`, [id]);

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:btCheckBlack:1491362638289174528> ลบ Record สำเร็จ',
                        `ลบ ID \`${id}\` ของ **${row.user_name}** แล้ว\nโดย: ${interaction.user.username}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // force-checkout ───────────────────────────────────────────────────

            if (sub === 'force-checkout') {
                const target = options.getUser('user');
                const active = await db.get(
                    `SELECT * FROM attendance WHERE user_id = ? AND status = 'Working'`,
                    [target.id]
                );

                if (!active) {
                    return interaction.editReply({ content: `<a:702045669044650015:1491121679303442543> ${target.username} ไม่ได้เข้างานค้างอยู่` });
                }

                const now  = moment().tz('Asia/Bangkok');
                const diff = Math.round(moment.duration(now.diff(moment(active.check_in_time))).asMinutes());
                const vd   = (diff > 0 && diff <= 1500) ? diff : 0;
                const ns   = vd > 0 ? 'Finished' : 'Invalid';

                await db.run(
                    `UPDATE attendance SET check_out_time = ?, duration_minutes = ?, status = ? WHERE id = ?`,
                    [now.format(), vd, ns, active.id]
                );

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:ovg_022_1436087287946547241:1491125277085143221> Force Checkout สำเร็จ',
                        `**${target.username}** — \`${Math.floor(vd / 60)} ชม. ${vd % 60} นาที\` [${ns}]\nโดย: ${interaction.user.username}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // add-time ─────────────────────────────────────────────────────────

            if (sub === 'add-time') {
                const target  = options.getUser('user');
                const minutes = options.getInteger('minutes');
                const note    = options.getString('note') || `เพิ่มโดย Admin: ${interaction.user.username}`;
                const now     = moment().tz('Asia/Bangkok');
                const season  = now.format('YYYY-MM');

                await db.run(
                    `INSERT INTO attendance
                        (user_id, user_name, check_in_time, check_out_time, duration_minutes, status, season, note)
                     VALUES (?, ?, ?, ?, ?, 'Finished', ?, ?)`,
                    [
                        target.id,
                        target.username,
                        now.clone().subtract(minutes, 'minutes').format(),
                        now.format(),
                        minutes,
                        season,
                        note,
                    ]
                );

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:702045669044650015:1491121679303442543> เพิ่มเวลาทำงานสำเร็จ',
                        `เพิ่ม \`${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที\` ให้ **${target.username}**` +
                        `\nเดือน: \`${season}\`` +
                        `\n<a:note:1480078708411863212> ${note}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // view-mvp ─────────────────────────────────────────────────────────

            if (sub === 'view-mvp') {
                const mvps = await db.all('SELECT * FROM mvp_stats ORDER BY wins DESC');

                let content = `## **:dividers: สถิติ MVP ทั้งหมด**\n\n`;

                if (!mvps.length) {
                    content += `*ยังไม่มีข้อมูล*\n`;
                } else {
                    mvps.forEach((m, i) => {
                        content += `\`${i + 1}\` <@${m.user_id}> — \`${m.wins} สมัย\``;
                        if (m.last_win) content += ` (ล่าสุด: ${m.last_win})`;
                        content += '\n';
                    });
                }

                return interaction.editReply({
                    components: [makeSimpleContainer(':bar_chart: MVP Stats', content)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // edit-mvp ─────────────────────────────────────────────────────────

            if (sub === 'edit-mvp') {
                const target = options.getUser('user');
                const wins   = options.getInteger('wins');

                await db.run(
                    `INSERT INTO mvp_stats (user_id, user_name, wins)
                     VALUES (?, ?, ?)
                     ON CONFLICT(user_id) DO UPDATE SET wins = ?, user_name = ?`,
                    [target.id, target.username, wins, wins, target.username]
                );

                return interaction.editReply({
                    components: [makeSimpleContainer(
                        '<a:btCheckBlack:1491362638289174528> แก้ไข MVP สำเร็จ',
                        `**${target.username}** wins ใหม่: \`${wins} สมัย\`\nโดย: ${interaction.user.username}`
                    )],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // db-stats ─────────────────────────────────────────────────────────

            if (sub === 'db-stats') {
                const season = moment().tz('Asia/Bangkok').format('YYYY-MM');

                const [total, finished, working, invalid, mins, mvpCount, monthRows] = await Promise.all([
                    db.get(`SELECT COUNT(*) as c FROM attendance`),
                    db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Finished'`),
                    db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Working'`),
                    db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Invalid'`),
                    db.get(`SELECT SUM(duration_minutes) as s FROM attendance WHERE status = 'Finished'`),
                    db.get(`SELECT COUNT(*) as c FROM mvp_stats`),
                    db.get(
                        `SELECT COUNT(*) as c, SUM(duration_minutes) as s
                         FROM attendance WHERE season = ? AND status = 'Finished'`,
                        [season]
                    ),
                ]);

                const totalMins  = mins.s       || 0;
                const monthMins  = monthRows.s  || 0;

                const content =
                    `## **:bar_chart: สถิติ Database**\n\n` +
                    `**ภาพรวมทั้งหมด**\n` +
                    `├ Records ทั้งหมด:      \`${total.c}\`\n` +
                    `├ Finished:             \`${finished.c}\`\n` +
                    `├ Working (ค้างอยู่):   \`${working.c}\`\n` +
                    `└ Invalid:              \`${invalid.c}\`\n\n` +
                    `**เวลารวมทั้งหมด**\n` +
                    `└ \`${Math.floor(totalMins / 60)} ชม. ${totalMins % 60} นาที\`\n\n` +
                    `**เดือนนี้ (${season})**\n` +
                    `└ Records: \`${monthRows.c}\` | เวลา: \`${Math.floor(monthMins / 60)} ชม.\`\n\n` +
                    `**MVP**\n` +
                    `└ ผู้รับรางวัล: \`${mvpCount.c} คน\`\n\n` +
                    `<:Frame5:1479714244240081008> API: \`http://82.26.104.104:${API_PORT}/api\``;

                return interaction.editReply({
                    components: [makeSimpleContainer(':bar_chart: ML Stats', content)],
                    flags: MessageFlags.IsComponentsV2,
                });
            }
        }
    }

    // ── Button Interactions ────────────────────────────────────────────────────

    if (interaction.isButton()) {
        const conf = await db.get('SELECT * FROM config WHERE guild_id = ?', [interaction.guildId]);
        if (!conf) return;

        const userAvatarURL = interaction.user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 256 });
        const logCh  = await client.channels.fetch(conf.log_ch);
        const now    = moment().tz('Asia/Bangkok');
        const season = now.format('YYYY-MM');

        // work_in ──────────────────────────────────────────────────────────────

        if (interaction.customId === 'work_in') {
            const active = await db.get(
                'SELECT * FROM attendance WHERE user_id = ? AND status = "Working"',
                [interaction.user.id]
            );

            if (active) {
                return interaction.reply({
                    components: [makeSimpleContainer(
                        '<a:910538969752678480:1491166389535248586> Warning',
                        'คุณมีเวลาเข้างานที่ยังค้างอยู่! กรุณากดออกงานก่อน'
                    )],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await db.run(
                'INSERT INTO attendance (user_id, user_name, check_in_time, status, season) VALUES (?, ?, ?, ?, ?)',
                [interaction.user.id, interaction.user.username, now.format(), 'Working', season]
            );

            const checkInLog = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## <a:702045669044650015:1491121679303442543> **<@${interaction.user.id}> - ลงชื่อเข้างาน**\n\n` +
                        `:clock6: **เวลา:** ${now.format('HH:mm:ss')}\n\n`
                    )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.checkIn } }])
                )
                .addSeparatorComponents(new SeparatorBuilder());

            const logData = checkInLog.toJSON();
            logData.thumbnail = { media: { url: userAvatarURL } };
            await logCh.send({ components: [logData], flags: MessageFlags.IsComponentsV2 });

            return interaction.reply({
                components: [makeSimpleContainer(
                    '<a:btCheckBlack:1491362638289174528> Success',
                    'บันทึกเข้างานสำเร็จ! ขอให้เป็นวันที่ดีในการทำงานครับ',
                    GALLERY_IMAGES.success
                )],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }

        // work_out ─────────────────────────────────────────────────────────────

        if (interaction.customId === 'work_out') {
            const active = await db.get(
                'SELECT * FROM attendance WHERE user_id = ? AND status = "Working"',
                [interaction.user.id]
            );

            if (!active) {
                return interaction.reply({
                    components: [makeSimpleContainer(
                        '<:970130538344103976:1479486383986049105> Error',
                        'ไม่พบข้อมูลการเข้างานของคุณ!'
                    )],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            const diff = Math.round(moment.duration(now.diff(moment(active.check_in_time))).asMinutes());

            if (diff > 1500) {
                await db.run(
                    'UPDATE attendance SET check_out_time = ?, duration_minutes = 0, status = "Invalid" WHERE id = ?',
                    [now.format(), active.id]
                );
                return interaction.reply({
                    components: [makeSimpleContainer(
                        '<:970130538344103976:1479486383986049105> ตรวจพบความผิดปกติ!',
                        `ระบบตรวจพบว่าคุณเข้างานค้างไว้เกิน **25 ชั่วโมง**\n` +
                        `**ผลลัพธ์:** เวลาถูกรีเซ็ตเป็น 0 และไม่ถูกนำไปคำนวณใน Leaderboard\n\n` +
                        `*กรุณากดเข้างานและออกงานตามเวลาจริงด้วยครับ*`
                    )],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                });
            }

            await db.run(
                'UPDATE attendance SET check_out_time = ?, duration_minutes = ?, status = "Finished" WHERE id = ?',
                [now.format(), diff, active.id]
            );

            const checkOutLog = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## <a:702045683087048704:1491121705777889550> **<@${interaction.user.id}> - ลงชื่อออกงาน**\n\n` +
                        `:clock12: **ระยะเวลาทำงาน**\n` +
                        `\`${Math.floor(diff / 60)} ชม. ${diff % 60} นาที\`\n\n` +
                        `:clock6: **เวลา:** ${now.format('HH:mm:ss')}\n\n`
                    )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.checkOut } }])
                )
                .addSeparatorComponents(new SeparatorBuilder());

            const logDataOut = checkOutLog.toJSON();
            logDataOut.thumbnail = { media: { url: userAvatarURL } };
            await logCh.send({ components: [logDataOut], flags: MessageFlags.IsComponentsV2 });

            return interaction.reply({
                components: [makeSimpleContainer(
                    '<a:btCheckBlack:1491362638289174528> Success',
                    'บันทึกออกงานสำเร็จ! ขอบคุณที่เหนื่อยมาทั้งวัน พักผ่อนให้เต็มที่นะครับ',
                    GALLERY_IMAGES.success
                )],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            });
        }
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  📅  CRON  —  สรุปรายเดือน ทุกวันที่ 1 เวลา 00:00 น.
// ══════════════════════════════════════════════════════════════════════════════

cron.schedule('0 0 1 * *', async () => {
    const lastMonth = moment().subtract(1, 'months').format('YYYY-MM');

    const all = await db.all(
        `SELECT user_id, user_name, SUM(duration_minutes) as total
         FROM attendance
         WHERE status = "Finished" AND season = ?
         GROUP BY user_id
         ORDER BY total DESC`,
        [lastMonth]
    );

    if (!all.length) return;

    // บันทึก MVP
    await db.run(
        `INSERT INTO mvp_stats (user_id, user_name, wins, last_win)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(user_id)
         DO UPDATE SET wins = wins + 1, last_win = ?, user_name = ?`,
        [all[0].user_id, all[0].user_name, lastMonth, lastMonth, all[0].user_name]
    );

    const confs = await db.all('SELECT * FROM config');

    for (const c of confs) {
        try {
            const ch    = await client.channels.fetch(c.notify_ch);
            const pages = [];

            // สร้าง leaderboard pages (ทีละ 5 คน)
            for (let i = 0; i < all.length; i += 5) {
                let pageContent = `## **:bar_chart: สรุปผลงานประจำเดือน: ${lastMonth}**\n\n`;

                all.slice(i, i + 5).forEach((s, idx) => {
                    pageContent +=
                        `**อันดับที่ ${i + idx + 1} <@${s.user_id}>**\n` +
                        `└ เวลารวม: \`${Math.floor(s.total / 60)} ชม. ${s.total % 60} นาที\`\n\n`;
                });

                pages.push(
                    new ContainerBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(pageContent))
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.stats } }])
                        )
                        .addSeparatorComponents(new SeparatorBuilder())
                );
            }

            let cur = 0;

            const makeBtn = (idx) => new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('p')
                    .setLabel('ย้อนกลับ')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(idx === 0),
                new ButtonBuilder()
                    .setCustomId('n')
                    .setLabel('ถัดไป')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(idx === pages.length - 1),
            );

            const mvpAnnounce = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## **<a:958372956059353158:1491122704999387299> ยินดีกับ MVP เดือนนี้**\n\n` +
                        `**:bust_in_silhouette: <@${all[0].user_id}>**\n\n`
                    )
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems([{ media: { url: GALLERY_IMAGES.trophy } }])
                )
                .addSeparatorComponents(new SeparatorBuilder());

            const mvpData = mvpAnnounce.toJSON();
            mvpData.thumbnail = { media: { url: GALLERY_IMAGES.mvp } };

            const msg = await ch.send({
                content: `<a:958372956059353158:1491122704999387299> **ยินดีกับ MVP เดือนนี้: <@${all[0].user_id}>** <:gw_144:1471558837675888742>`,
                components: [mvpData, pages[0], makeBtn(0)],
                flags: MessageFlags.IsComponentsV2,
            });

            const col = msg.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 86_400_000,
            });

            col.on('collect', async i => {
                i.customId === 'p' ? cur-- : cur++;
                await i.update({
                    components: [mvpData, pages[cur], makeBtn(cur)],
                    flags: MessageFlags.IsComponentsV2,
                });
            });

        } catch (e) {
            console.error(e);
        }
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  🌐  EXPRESS APP  +  MIDDLEWARE
// ══════════════════════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());

const requireAuth = (req, res, next) => {
    const key = req.headers['x-api-key'] || req.query.key;
    if (key !== API_SECRET) {
        return res.status(401).json({ error: 'Unauthorized', message: 'ต้องใส่ X-Api-Key ที่ถูกต้อง' });
    }
    next();
};

// ══════════════════════════════════════════════════════════════════════════════
//  🖥️  WEB DASHBOARD  (inline HTML)
// ══════════════════════════════════════════════════════════════════════════════

const DASHBOARD_HTML = () => `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Military Life</title>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&family=Noto+Sans+Thai:wght@300;400;500;700&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<link rel="icon" type="image/png" href="Logo.png">
<link rel="apple-touch-icon" href="Logo.png">
<style>
:root{
  --bg:#07030f;--surface:#0f0719;--card:#140b22;--border:#2a1848;
  --accent:#c084fc;--accent2:#a855f7;--accent3:#7c3aed;
  --white:#f5eeff;--white2:rgba(245,238,255,0.88);
  --green:#86efac;--yellow:#fde68a;--red:#fca5a5;
  --text:#f3e8ff;--muted:#7857a8;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
#bg-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;width:100%;height:100%}
body{font-family:'Noto Sans Thai',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}

/* Noise */
body::before{content:'';position:fixed;inset:0;opacity:.35;pointer-events:none;z-index:1;
  background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.025'/%3E%3C/svg%3E")}
/* Scanlines */
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:1;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(160,100,240,.01) 3px,rgba(160,100,240,.01) 4px)}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(168,85,247,.4);border-radius:4px}

/* ══ AURORA BANDS ══ */
.aurora{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.aurora-b{position:absolute;height:45%;width:130%;left:-15%;filter:blur(90px);border-radius:50%;opacity:.1;animation:auroraDrift ease infinite}
.aurora-b:nth-child(1){top:5%;background:linear-gradient(90deg,transparent,rgba(124,58,237,.7),rgba(192,132,252,.5),transparent);animation-duration:14s}
.aurora-b:nth-child(2){top:25%;background:linear-gradient(90deg,transparent,rgba(168,85,247,.35),rgba(240,171,252,.3),transparent);animation-duration:20s;animation-delay:-7s;transform:scaleY(.4);opacity:.06}
.aurora-b:nth-child(3){bottom:10%;background:linear-gradient(90deg,transparent,rgba(107,33,168,.5),rgba(192,132,252,.3),transparent);animation-duration:17s;animation-delay:-4s;opacity:.07}
@keyframes auroraDrift{0%,100%{transform:translateX(-8%) scaleY(1)}50%{transform:translateX(8%) scaleY(1.4)}}

/* ══ PARTICLES ══ */
.ptc-wrap{position:fixed;inset:0;pointer-events:none;z-index:2;overflow:hidden}
.ptc{position:absolute;border-radius:50%;opacity:0;animation:ptcUp linear infinite}
@keyframes ptcUp{0%{opacity:0;transform:translateY(100vh) scale(0)}8%{opacity:.9}88%{opacity:.3}100%{opacity:0;transform:translateY(-8vh) scale(1.3)}}

/* ══ LOGIN WALL ══ */
#loginWall{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:999;padding:16px}
.lw-bg{position:absolute;inset:0;background:radial-gradient(ellipse 90% 70% at 50% 45%,rgba(124,58,237,.18) 0%,rgba(7,3,15,.96) 70%);backdrop-filter:blur(2px)}
.lw-wrap{position:relative;z-index:2;width:100%;max-width:420px;animation:lPop .75s cubic-bezier(.16,1,.3,1) both;opacity:0;transform:translateY(22px) scale(.96)}
@keyframes lPop{to{opacity:1;transform:translateY(0) scale(1)}}

.lw-ring{position:absolute;border-radius:50%;pointer-events:none;border:1px solid rgba(192,132,252,.12);animation:ringRot linear infinite}
.lw-ring:nth-child(1){inset:-52px;animation-duration:11s}
.lw-ring:nth-child(2){inset:-88px;animation-duration:17s;animation-direction:reverse;border-color:rgba(124,58,237,.08)}
.lw-ring::before{content:'';position:absolute;width:9px;height:9px;border-radius:50%;top:-4.5px;left:50%;transform:translateX(-50%);background:var(--accent);box-shadow:0 0 12px var(--accent),0 0 24px rgba(192,132,252,.5)}
@keyframes ringRot{to{transform:rotate(360deg)}}

.lw-box{
  background:rgba(12,6,22,.93);border:1px solid rgba(192,132,252,.18);border-radius:24px;
  padding:clamp(32px,6vw,48px) clamp(24px,6vw,42px);text-align:center;
  box-shadow:0 0 90px rgba(124,58,237,.12),0 0 0 1px rgba(192,132,252,.04),inset 0 1px 0 rgba(255,255,255,.05);
  backdrop-filter:blur(30px);position:relative;overflow:hidden;
}
.lw-box::before{content:'';position:absolute;top:0;left:-100%;width:50%;height:2px;
  background:linear-gradient(90deg,transparent,rgba(192,132,252,.85),transparent);animation:shimmer 3.5s ease infinite}
@keyframes shimmer{0%{left:-60%}100%{left:160%}}

.lw-icon{width:74px;height:74px;margin:0 auto 18px;border-radius:50%;border:2px solid rgba(192,132,252,.28);
  display:flex;align-items:center;justify-content:center;font-size:28px;
  background:radial-gradient(circle,rgba(124,58,237,.1),transparent);position:relative;animation:iconPulse 3s ease infinite}
@keyframes iconPulse{0%,100%{box-shadow:0 0 0 0 rgba(192,132,252,.3)}50%{box-shadow:0 0 0 14px rgba(192,132,252,0)}}
.lw-icon::before{content:'';position:absolute;inset:-8px;border-radius:50%;border:1px dashed rgba(192,132,252,.18);animation:ringRot 7s linear infinite}

.lw-title{font-family:'Orbitron',sans-serif;font-size:clamp(15px,4.5vw,22px);font-weight:900;letter-spacing:3px;
  background:linear-gradient(135deg,#f5eeff 0%,var(--accent) 45%,var(--accent3) 100%);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(192,132,252,.4));margin-bottom:4px}
.lw-sub{font-size:10px;color:var(--muted);letter-spacing:4px;text-transform:uppercase;font-family:'Share Tech Mono',monospace}
.lw-desc{font-size:13px;color:var(--muted);margin:18px 0 22px;line-height:1.7}

.inp-wrap{position:relative;margin-bottom:13px}
.inp-icon{position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:13px;opacity:.45;pointer-events:none}
.lw-box input{
  width:100%;background:rgba(7,3,15,.7);border:1px solid rgba(192,132,252,.16);border-radius:12px;
  padding:13px 14px 13px 38px;color:var(--text);font-size:14px;outline:none;transition:all .3s;
  font-family:'Share Tech Mono',monospace;letter-spacing:1px;-webkit-appearance:none;
}
.lw-box input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(192,132,252,.11),0 0 18px rgba(192,132,252,.06)}
.lw-box input::placeholder{color:var(--muted);letter-spacing:0;font-family:'Noto Sans Thai',sans-serif;font-size:13px}

.login-err{color:#fca5a5;font-size:12px;margin-bottom:12px;display:none;animation:shake .4s ease;
  padding:8px 14px;background:rgba(252,165,165,.06);border:1px solid rgba(252,165,165,.2);border-radius:8px;
  font-family:'Share Tech Mono',monospace}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}

/* ══ BUTTONS ══ */
.btn{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:10px;border:none;
  cursor:pointer;font-size:14px;font-family:'Noto Sans Thai',sans-serif;font-weight:500;
  transition:all .25s;position:relative;overflow:hidden;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.btn::after{content:'';position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,.07),transparent);opacity:0;transition:opacity .2s}
.btn:hover::after,.btn:active::after{opacity:1}

.btn-primary{
  background:linear-gradient(135deg,var(--accent3) 0%,var(--accent2) 50%,var(--accent) 100%);
  background-size:200% 100%;color:#fff;width:100%;justify-content:center;
  padding:14px;font-size:15px;font-weight:600;letter-spacing:1px;border-radius:12px;
  box-shadow:0 4px 24px rgba(124,58,237,.45);animation:btnGrad 4s ease infinite;
}
@keyframes btnGrad{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.btn-primary::before{content:'';position:absolute;top:-50%;left:-60%;width:40%;height:200%;background:rgba(255,255,255,.13);transform:skewX(-20deg);transition:left .5s}
.btn-primary:hover::before{left:160%}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(124,58,237,.55),0 0 40px rgba(192,132,252,.2)}
.btn-primary:active{transform:translateY(0)}
.btn-danger{background:rgba(252,165,165,.07);color:#fca5a5;border:1px solid rgba(252,165,165,.18)}
.btn-danger:hover{background:rgba(252,165,165,.14);box-shadow:0 0 10px rgba(252,165,165,.12)}
.btn-ghost{background:rgba(255,255,255,.03);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{background:rgba(192,132,252,.06);border-color:rgba(192,132,252,.22)}
.btn-ghost:disabled{opacity:.4;cursor:not-allowed}
.btn-success{background:rgba(134,239,172,.07);color:var(--green);border:1px solid rgba(134,239,172,.18)}
.btn-success:hover{background:rgba(134,239,172,.13);box-shadow:0 0 10px rgba(134,239,172,.08)}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}

/* ══ HEADER ══ */
header{
  padding:13px 20px;display:flex;align-items:center;justify-content:space-between;
  background:rgba(7,3,15,.88);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);
  position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(192,132,252,.07);
}
header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--accent2),var(--accent3),transparent);opacity:.55}

.logo{font-family:'Orbitron',sans-serif;font-size:clamp(12px,3.2vw,18px);font-weight:900;
  letter-spacing:clamp(1px,.5vw,3px);display:flex;align-items:center;gap:9px;flex-shrink:0}
.logo-badge{width:31px;height:31px;border-radius:8px;display:flex;align-items:center;justify-content:center;
  font-size:13px;flex-shrink:0;
  background:linear-gradient(135deg,rgba(124,58,237,.4),rgba(192,132,252,.2));
  border:1px solid rgba(192,132,252,.28);box-shadow:0 0 12px rgba(124,58,237,.3);animation:badgePulse 3s ease infinite}
@keyframes badgePulse{0%,100%{box-shadow:0 0 8px rgba(124,58,237,.3)}50%{box-shadow:0 0 20px rgba(124,58,237,.6),0 0 35px rgba(192,132,252,.18)}}
.logo-text{background:linear-gradient(90deg,var(--white),var(--accent),#d8b4fe,var(--accent3));
  background-size:200% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;
  animation:gradShift 5s linear infinite,glitch 12s infinite;filter:drop-shadow(0 0 8px rgba(192,132,252,.4))}
@keyframes gradShift{0%{background-position:0%}100%{background-position:200%}}
@keyframes glitch{0%,93%,100%{clip-path:none;transform:none}
  94%{clip-path:polygon(0 15%,100% 15%,100% 30%,0 30%);transform:translateX(-2px)}
  95%{clip-path:polygon(0 58%,100% 58%,100% 72%,0 72%);transform:translateX(2px)}
  96%{clip-path:none;transform:none}}

.hdr-right{display:flex;align-items:center;gap:9px;flex-shrink:0}
.bot-status{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted);
  font-family:'Share Tech Mono',monospace;padding:5px 11px;
  border:1px solid rgba(134,239,172,.11);border-radius:20px;background:rgba(134,239,172,.03);white-space:nowrap}
.dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--green);
  box-shadow:0 0 8px var(--green),0 0 16px rgba(134,239,172,.4);animation:dotPulse 2s infinite}
@keyframes dotPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.7)}}
.bot-status span{display:none}
@media(min-width:480px){.bot-status span{display:inline}}

.logout-btn{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:8px;
  border:1px solid rgba(252,165,165,.17);background:rgba(252,165,165,.04);
  color:rgba(252,165,165,.75);font-size:11px;cursor:pointer;transition:all .25s;
  font-family:'Share Tech Mono',monospace;letter-spacing:1px;white-space:nowrap;-webkit-tap-highlight-color:transparent}
.logout-btn:hover,.logout-btn:active{background:rgba(252,165,165,.1);border-color:rgba(252,165,165,.32);color:#fca5a5;box-shadow:0 0 10px rgba(252,165,165,.1)}

/* ══ LAYOUT ══ */
main{padding:20px 16px;max-width:1400px;margin:0 auto;position:relative;z-index:10}
@media(min-width:640px){main{padding:28px 28px}}
@media(min-width:1024px){main{padding:32px 40px}}

/* ══ TABS ══ */
.tabs-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:22px;scrollbar-width:none}
.tabs-wrap::-webkit-scrollbar{display:none}
.tabs{display:flex;gap:2px;background:rgba(12,6,22,.8);border:1px solid var(--border);
  border-radius:14px;padding:4px;width:fit-content;min-width:100%;backdrop-filter:blur(12px);position:relative;overflow:hidden}
.tabs::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(192,132,252,.4),transparent)}
.tab{flex:1;min-width:fit-content;padding:10px 15px;border-radius:10px;border:none;background:none;
  color:var(--muted);font-family:'Noto Sans Thai',sans-serif;font-size:13px;cursor:pointer;
  transition:all .3s;white-space:nowrap;font-weight:500;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.tab.active{background:rgba(124,58,237,.14);color:var(--accent);border:1px solid rgba(192,132,252,.24);
  box-shadow:0 0 16px rgba(124,58,237,.14),inset 0 1px 0 rgba(192,132,252,.14);font-weight:600}
.tab:not(.active):hover{color:var(--text);background:rgba(192,132,252,.04)}
.tab-content{display:none;animation:tabIn .35s cubic-bezier(.16,1,.3,1)}
.tab-content.active{display:block}
@keyframes tabIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

/* ══ SECTION TITLE ══ */
.sec-ttl{font-family:'Orbitron',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;
  color:var(--accent);margin-bottom:18px;display:flex;align-items:center;gap:10px}
.sec-ttl::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(192,132,252,.3),transparent)}

/* ══ STAT CARDS ══ */
.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:24px}
@media(min-width:540px){.stat-grid{grid-template-columns:repeat(3,1fr);gap:13px}}
@media(min-width:900px){.stat-grid{grid-template-columns:repeat(4,1fr);gap:15px}}

.stat-card{background:var(--card);border:1px solid var(--border);border-radius:16px;
  padding:17px 15px;position:relative;overflow:hidden;transition:all .3s;cursor:default;animation:cardIn .5s ease both}
@media(min-width:640px){.stat-card{padding:21px 20px}}
@keyframes cardIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
.stat-card:hover{transform:translateY(-4px) scale(1.01);box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 30px rgba(124,58,237,.08)}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;transition:filter .3s}
.stat-card::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% -5%,rgba(192,132,252,.06),transparent 60%);opacity:0;transition:opacity .3s}
.stat-card:hover::after{opacity:1}
.c-purple::before{background:linear-gradient(90deg,var(--accent2),transparent)}
.c-white::before{background:linear-gradient(90deg,rgba(245,238,255,.55),transparent)}
.c-green::before{background:linear-gradient(90deg,var(--green),transparent)}
.c-yellow::before{background:linear-gradient(90deg,var(--yellow),transparent)}
.c-red::before{background:linear-gradient(90deg,var(--red),transparent)}
.c-pink::before{background:linear-gradient(90deg,#f0abfc,transparent)}

.stat-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;font-family:'Share Tech Mono',monospace}
.stat-val{font-family:'Orbitron',sans-serif;font-size:clamp(22px,4.5vw,33px);font-weight:700;line-height:1;
  background:linear-gradient(135deg,var(--white),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-sub{font-size:11px;color:var(--muted);margin-top:7px;font-family:'Share Tech Mono',monospace}
.stat-ico{position:absolute;top:15px;right:15px;font-size:19px;opacity:.1;transition:all .3s}
.stat-card:hover .stat-ico{opacity:.24;transform:scale(1.2) rotate(8deg)}

/* ══ TABLE ══ */
.table-wrap{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;position:relative}
.table-wrap::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(192,132,252,.4),transparent)}
.tbl-hdr{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;
  justify-content:space-between;gap:10px;flex-wrap:wrap;background:rgba(124,58,237,.025)}
@media(min-width:640px){.tbl-hdr{padding:16px 22px}}
.tbl-ttl{font-family:'Orbitron',sans-serif;font-size:13px;font-weight:600;letter-spacing:1px;color:var(--white2)}
.tbl-ctrl{display:flex;gap:7px;align-items:center;flex-wrap:wrap;width:100%;margin-top:8px}
@media(min-width:900px){.tbl-ctrl{width:auto;margin-top:0}}

.sbox{background:rgba(7,3,15,.7);border:1px solid var(--border);border-radius:8px;padding:8px 12px;
  color:var(--text);font-size:13px;outline:none;width:100%;font-family:'Noto Sans Thai',sans-serif;
  transition:all .25s;-webkit-appearance:none}
@media(min-width:480px){.sbox{width:auto}}
.sbox:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(192,132,252,.1)}
select.sbox{cursor:pointer}

.tbl-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
table{width:100%;border-collapse:collapse;min-width:520px}
th{padding:10px 14px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;
  color:var(--muted);border-bottom:1px solid var(--border);white-space:nowrap;
  font-family:'Share Tech Mono',monospace;background:rgba(0,0,0,.1)}
@media(min-width:768px){th{padding:11px 18px}}
td{padding:11px 14px;font-size:13px;border-bottom:1px solid rgba(42,24,72,.5);vertical-align:middle;transition:background .2s}
@media(min-width:768px){td{padding:12px 18px}}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(124,58,237,.03)}

.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;
  font-size:10px;font-weight:600;letter-spacing:.5px;font-family:'Share Tech Mono',monospace;white-space:nowrap}
.bdg-work{background:rgba(253,230,138,.09);color:var(--yellow);border:1px solid rgba(253,230,138,.19)}
.bdg-done{background:rgba(134,239,172,.07);color:var(--green);border:1px solid rgba(134,239,172,.18)}
.bdg-bad{background:rgba(252,165,165,.07);color:var(--red);border:1px solid rgba(252,165,165,.18)}

.rank-n{font-family:'Orbitron',sans-serif;font-size:16px;font-weight:700;color:var(--muted)}
.rank-n.gold{color:#fde68a;text-shadow:0 0 14px rgba(253,230,138,.6)}
.rank-n.silver{color:#e2e8f0;text-shadow:0 0 10px rgba(226,232,240,.3)}
.rank-n.bronze{color:#fdba74;text-shadow:0 0 10px rgba(253,186,116,.3)}

.prog-bar{height:4px;background:rgba(42,24,72,.8);border-radius:2px;margin-top:4px;overflow:hidden;min-width:80px}
.prog-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--accent3),var(--accent));transition:width 1s cubic-bezier(.16,1,.3,1);position:relative}
.prog-fill::after{content:'';position:absolute;right:0;top:0;bottom:0;width:16px;background:rgba(255,255,255,.22);filter:blur(3px)}

.u-avatar{width:31px;height:31px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,var(--accent3),var(--accent));
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;font-family:'Orbitron',sans-serif;
  box-shadow:0 0 10px rgba(124,58,237,.28);border:1px solid rgba(192,132,252,.2)}
.u-cell{display:flex;align-items:center;gap:9px}
.u-name{font-weight:500;font-size:13px}
.u-id{font-size:11px;color:var(--muted);font-family:'Share Tech Mono',monospace}

.pager{display:flex;align-items:center;justify-content:flex-end;gap:7px;
  padding:12px 16px;border-top:1px solid var(--border);background:rgba(0,0,0,.1);flex-wrap:wrap}
@media(min-width:640px){.pager{padding:13px 22px}}
.pg-info{font-size:11px;color:var(--muted);margin-right:auto;font-family:'Share Tech Mono',monospace}

/* ══ MODAL ══ */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.76);display:none;align-items:center;
  justify-content:center;z-index:500;backdrop-filter:blur(8px);padding:16px}
.modal-bg.open{display:flex}
.modal{background:rgba(10,5,18,.97);border:1px solid rgba(192,132,252,.18);border-radius:20px;
  padding:clamp(22px,4vw,32px);width:100%;max-width:480px;
  animation:mIn .3s cubic-bezier(.16,1,.3,1);max-height:92vh;overflow-y:auto;
  box-shadow:0 0 60px rgba(124,58,237,.12);position:relative}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--accent2),transparent)}
@keyframes mIn{from{opacity:0;transform:scale(.93) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
.modal h3{font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700;margin-bottom:20px;letter-spacing:1px;color:var(--accent)}
.fg{margin-bottom:14px}
.fg label{display:block;font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;font-family:'Share Tech Mono',monospace}
.fg input,.fg select,.fg textarea{width:100%;background:rgba(7,3,15,.7);border:1px solid var(--border);border-radius:8px;
  padding:10px 13px;color:var(--text);font-size:13px;outline:none;transition:all .25s;
  font-family:'Noto Sans Thai',sans-serif;-webkit-appearance:none}
.fg input:focus,.fg select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(192,132,252,.1)}
.mact{display:flex;gap:9px;margin-top:20px;justify-content:flex-end;flex-wrap:wrap}

/* ══ TOAST ══ */
#toast{position:fixed;bottom:18px;right:16px;left:16px;background:rgba(10,5,18,.96);border:1px solid var(--border);
  border-radius:12px;padding:12px 17px;font-size:13px;display:flex;align-items:center;gap:9px;
  z-index:9999;transform:translateY(80px) scale(.95);opacity:0;transition:all .35s cubic-bezier(.16,1,.3,1);
  box-shadow:0 8px 40px rgba(0,0,0,.5);backdrop-filter:blur(12px);max-width:360px;margin:0 auto}
@media(min-width:600px){#toast{right:22px;left:auto;margin:0}}
#toast.show{transform:translateY(0) scale(1);opacity:1}
#toast.success{border-color:rgba(134,239,172,.28);box-shadow:0 8px 40px rgba(0,0,0,.5),0 0 20px rgba(134,239,172,.07)}
#toast.error{border-color:rgba(252,165,165,.28);box-shadow:0 8px 40px rgba(0,0,0,.5),0 0 20px rgba(252,165,165,.07)}

/* ══ LOADING / EMPTY ══ */
.loading{display:flex;align-items:center;justify-content:center;padding:50px 20px;color:var(--muted);gap:11px;
  font-family:'Share Tech Mono',monospace;font-size:11px;letter-spacing:2px}
.spin{width:19px;height:19px;border:2px solid rgba(192,132,252,.1);border-top-color:var(--accent);
  border-radius:50%;animation:spinAnim .8s linear infinite;box-shadow:0 0 8px rgba(192,132,252,.18);flex-shrink:0}
@keyframes spinAnim{to{transform:rotate(360deg)}}
.empty{text-align:center;padding:50px 20px;color:var(--muted);font-size:14px}
.empty-ico{font-size:34px;margin-bottom:12px;opacity:.22;display:block}

/* ══ SEASON BAR ══ */
.sbar{display:flex;align-items:center;gap:9px;margin-bottom:17px;flex-wrap:wrap}
.sbar label{font-size:11px;color:var(--muted);font-family:'Share Tech Mono',monospace;letter-spacing:1px;white-space:nowrap}

/* ══ MVP ══ */
.mvp-grid{display:grid;grid-template-columns:1fr;gap:13px}
@media(min-width:480px){.mvp-grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.mvp-grid{grid-template-columns:repeat(3,1fr)}}

.mvp-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:20px 18px;
  display:flex;align-items:center;gap:15px;transition:all .3s;position:relative;overflow:hidden;animation:cardIn .5s ease both}
.mvp-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:linear-gradient(90deg,var(--yellow),transparent)}
.mvp-card:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(253,230,138,.07);border-color:rgba(253,230,138,.18)}
.mvp-card::after{content:'👑';position:absolute;right:13px;top:13px;font-size:21px;opacity:.08;transition:opacity .3s}
.mvp-card:hover::after{opacity:.2}
.mvp-av{width:50px;height:50px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#fde68a,#f59e0b);display:flex;align-items:center;justify-content:center;
  font-size:19px;box-shadow:0 0 18px rgba(253,230,138,.22);border:2px solid rgba(253,230,138,.22)}
.mvp-info h4{font-weight:600;font-size:14px;margin-bottom:4px;color:var(--white2)}
.mvp-wins{font-family:'Orbitron',sans-serif;font-size:27px;font-weight:700;color:var(--yellow);line-height:1;text-shadow:0 0 15px rgba(253,230,138,.4)}
.mvp-wlbl{font-size:10px;color:var(--muted);font-family:'Share Tech Mono',monospace;margin-top:2px}
</style>
</head>
<body>

<canvas id="bg-canvas"></canvas>

<!-- Aurora -->
<div class="aurora"><div class="aurora-b"></div><div class="aurora-b"></div><div class="aurora-b"></div></div>

<!-- Particles -->
<div class="ptc-wrap" id="ptcWrap"></div>

<!-- ════ LOGIN ════ -->
<div id="loginWall">
  <div class="lw-bg"></div>
  <div class="lw-wrap">
    <div class="lw-ring"></div><div class="lw-ring"></div>
    <div class="lw-box">
      <div class="lw-icon"> 👑</div>
      <div class="lw-title">Military Life</div>
      <div class="lw-sub">Secure Access Portal</div>
      <p class="lw-desc">ใส่ API Key เพื่อเข้าถึงระบบ<br><span style="font-size:10px;opacity:.45;font-family:'Share Tech Mono',monospace">AUTHORIZED PERSONNEL ONLY</span></p>
      <div class="inp-wrap">
        <span class="inp-icon">🔑</span>
        <input type="password" id="keyInput" placeholder="ใส่ API Key ของคุณ..." autocomplete="off"/>
      </div>
      <div class="login-err" id="loginErr">⛔ API Key ไม่ถูกต้อง — กรุณาลองใหม่</div>
      <button class="btn btn-primary" id="loginBtn" onclick="doLogin()">
        <span style="font-family:'Orbitron',sans-serif;font-size:12px;letter-spacing:2px">ENTER SYSTEM</span>
      </button>
      <div style="margin-top:16px;font-size:10px;color:var(--muted);font-family:'Share Tech Mono',monospace;opacity:.4">Military Life v1.0</div>
    </div>
  </div>
</div>

<!-- ════ HEADER ════ -->
<header>
  <div class="logo">
    <div class="logo-badge"> 👑</div>
    <span class="logo-text">Military Life</span>
  </div>
  <div class="hdr-right">
    <div class="bot-status"><div class="dot"></div><span id="botName">ONLINE</span></div>
    <button class="logout-btn" onclick="logout()">⏏ LOGOUT</button>
  </div>
</header>

<!-- ════ MAIN ════ -->
<main>
  <div class="tabs-wrap">
    <div class="tabs">
      <button class="tab active" onclick="switchTab('overview',this)">📊 ภาพรวม</button>
      <button class="tab" onclick="switchTab('leaderboard',this)">🏆 อันดับ</button>
      <button class="tab" onclick="switchTab('attendance',this)">📋 ประวัติ</button>
      <button class="tab" onclick="switchTab('mvp',this)">👑 MVP</button>
    </div>
  </div>

  <!-- OVERVIEW -->
  <div class="tab-content active" id="tab-overview">
    <div class="sec-ttl">⚙ SYSTEM OVERVIEW</div>
    <div class="stat-grid" id="statCards">
      <div style="grid-column:1/-1" class="loading"><div class="spin"></div>LOADING DATA...</div>
    </div>
  </div>

  <!-- LEADERBOARD -->
  <div class="tab-content" id="tab-leaderboard">
    <div class="sbar">
      <label>SEASON:</label>
      <input type="month" class="sbox" id="lbSeason" style="width:155px" onchange="loadLeaderboard()">
      <button class="btn btn-ghost btn-sm" onclick="loadLeaderboard()">⟳ REFRESH</button>
    </div>
    <div class="table-wrap">
      <div class="tbl-hdr"><span class="tbl-ttl">🏆 LEADERBOARD — คนขยัน</span></div>
      <div class="tbl-scroll"><div id="lbTable"><div class="loading"><div class="spin"></div>LOADING...</div></div></div>
    </div>
  </div>

  <!-- ATTENDANCE -->
  <div class="tab-content" id="tab-attendance">
    <div class="table-wrap">
      <div class="tbl-hdr">
        <span class="tbl-ttl">📋 ATTENDANCE LOG</span>
        <div class="tbl-ctrl">
          <input type="month" class="sbox" id="attSeason" style="width:148px" onchange="loadAttendance()">
          <input type="text" class="sbox" id="attSearch" placeholder="ค้นหาชื่อ..." oninput="filterAtt()">
          <select class="sbox" id="attStatus" onchange="loadAttendance()" style="max-width:145px">
            <option value="">ทุก Status</option>
            <option value="Finished">✅ Finished</option>
            <option value="Working">⏳ Working</option>
            <option value="Invalid">❌ Invalid</option>
          </select>
          <button class="btn btn-success btn-sm" onclick="openAddModal()">+ ADD</button>
        </div>
      </div>
      <div class="tbl-scroll"><div id="attTable"><div class="loading"><div class="spin"></div>LOADING...</div></div></div>
      <div class="pager">
        <span class="pg-info" id="attPgInfo"></span>
        <button class="btn btn-ghost btn-sm" id="prevBtn" onclick="changePage(-1)">← PREV</button>
        <button class="btn btn-ghost btn-sm" id="nextBtn" onclick="changePage(1)">NEXT →</button>
      </div>
    </div>
  </div>

  <!-- MVP -->
  <div class="tab-content" id="tab-mvp">
    <div class="sec-ttl">👑 MVP HALL OF FAME</div>
    <div id="mvpGrid"><div class="loading"><div class="spin"></div>LOADING...</div></div>
  </div>
</main>

<!-- MODAL EDIT -->
<div class="modal-bg" id="editModal">
  <div class="modal">
    <h3>✏ EDIT RECORD</h3>
    <input type="hidden" id="editId">
    <div class="fg"><label>ชื่อผู้ใช้</label><input type="text" id="editName" readonly style="opacity:.5"></div>
    <div class="fg"><label>เวลาเข้างาน</label><input type="datetime-local" id="editIn"></div>
    <div class="fg"><label>เวลาออกงาน</label><input type="datetime-local" id="editOut"></div>
    <div class="fg"><label>Status</label>
      <select id="editStatus">
        <option value="Finished">Finished</option>
        <option value="Working">Working</option>
        <option value="Invalid">Invalid</option>
      </select>
    </div>
    <div class="fg"><label>หมายเหตุ</label><input type="text" id="editNote" placeholder="(ไม่บังคับ)"></div>
    <div class="mact">
      <button class="btn btn-danger btn-sm" onclick="deleteRecord()">🗑 DELETE</button>
      <button class="btn btn-ghost" onclick="closeModal('editModal')">CANCEL</button>
      <button class="btn btn-primary" onclick="saveEdit()" style="width:auto;padding:10px 22px;font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:1px">SAVE</button>
    </div>
  </div>
</div>

<!-- MODAL ADD -->
<div class="modal-bg" id="addModal">
  <div class="modal">
    <h3>+ NEW RECORD</h3>
    <div class="fg"><label>User ID</label><input type="text" id="addUserId" placeholder="Discord User ID"></div>
    <div class="fg"><label>ชื่อ</label><input type="text" id="addUserName" placeholder="ชื่อผู้ใช้"></div>
    <div class="fg"><label>เวลาเข้างาน</label><input type="datetime-local" id="addIn"></div>
    <div class="fg"><label>เวลาออกงาน</label><input type="datetime-local" id="addOut"></div>
    <div class="fg"><label>เดือน (season)</label><input type="month" id="addSeason"></div>
    <div class="fg"><label>หมายเหตุ</label><input type="text" id="addNote" placeholder="(ไม่บังคับ)"></div>
    <div class="mact">
      <button class="btn btn-ghost" onclick="closeModal('addModal')">CANCEL</button>
      <button class="btn btn-primary" onclick="saveAdd()" style="width:auto;padding:10px 22px;font-family:'Share Tech Mono',monospace;font-size:12px;letter-spacing:1px">ADD</button>
    </div>
  </div>
</div>

<div id="toast"></div>

<script>
/* ══ 3D BG ══ */
(function(){
  const cv=document.getElementById('bg-canvas'),ctx=cv.getContext('2d');
  let W,H,t=0,mx=.5,my=.5,tmx=.5,tmy=.5;
  function resize(){W=cv.width=window.innerWidth;H=cv.height=window.innerHeight}
  resize();
  window.addEventListener('resize',resize);
  window.addEventListener('mousemove',e=>{tmx=e.clientX/W;tmy=e.clientY/H});
  window.addEventListener('touchmove',e=>{tmx=e.touches[0].clientX/W;tmy=e.touches[0].clientY/H},{passive:true});

  function gGrid(){return W<640?{c:10,r:8}:W<1024?{c:16,r:11}:{c:24,r:15}}

  function drawGrid(){
    const{c:cols,r:rows}=gGrid();const pts=[];
    for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){
      const bx=(c/cols)*W,by=(r/rows)*H;
      const dx=mx-c/cols,dy=my-r/rows,dist=Math.sqrt(dx*dx+dy*dy);
      const wave=Math.sin(t*.65+c*.26+r*.34)*9;
      const ripple=Math.max(0,1-dist*2.4)*Math.sin(t*1.9-dist*7)*17;
      pts.push({x:bx+wave*.4,y:by+wave+ripple});
    }
    for(let r=0;r<=rows;r++){
      ctx.beginPath();
      for(let c=0;c<=cols;c++){const p=pts[r*(cols+1)+c];c===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)}
      ctx.strokeStyle=\`rgba(168,85,247,\${.025+(r/rows)*.05})\`;ctx.lineWidth=.6;ctx.stroke();
    }
    for(let c=0;c<=cols;c++){
      ctx.beginPath();
      for(let r=0;r<=rows;r++){const p=pts[r*(cols+1)+c];r===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y)}
      ctx.strokeStyle=\`rgba(232,220,255,\${.02+(c/cols)*.025})\`;ctx.lineWidth=.5;ctx.stroke();
    }
    pts.forEach(p=>{
      const ddx=p.x/W-mx,ddy=p.y/H-my,d=Math.sqrt(ddx*ddx+ddy*ddy);
      if(d<.1){ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fillStyle=\`rgba(192,132,252,\${(0.1-d)*7})\`;ctx.fill()}
    });
  }

  const orbs=[
    {x:.15,y:.2,vx:.00018,vy:.00012,r:280,col:'124,58,237'},
    {x:.85,y:.75,vx:-.00015,vy:.00019,r:260,col:'192,132,252'},
    {x:.5,y:.9,vx:.00012,vy:-.00016,r:240,col:'168,85,247'},
    {x:.05,y:.6,vx:.00019,vy:-.0001,r:200,col:'216,180,254'},
    {x:.9,y:.15,vx:-.0001,vy:.00014,r:180,col:'107,33,168'},
  ];
  function drawOrbs(){
    orbs.forEach((o,i)=>{
      o.x+=o.vx;o.y+=o.vy;if(o.x<0||o.x>1)o.vx*=-1;if(o.y<0||o.y>1)o.vy*=-1;
      const a=.055+Math.sin(t*.38+i)*.018;
      const g=ctx.createRadialGradient(o.x*W,o.y*H,0,o.x*W,o.y*H,o.r);
      g.addColorStop(0,\`rgba(\${o.col},\${a})\`);g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    });
  }

  const stars=Array.from({length:W<640?55:90},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.1+.2,a:Math.random()*.45+.08,tw:Math.random()*Math.PI*2,sp:Math.random()*.018+.007}));
  function drawStars(){
    stars.forEach(s=>{s.tw+=s.sp;const a=s.a*(.5+.5*Math.sin(s.tw));
      ctx.beginPath();ctx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2);ctx.fillStyle=\`rgba(232,215,255,\${a})\`;ctx.fill();
    });
  }

  const shoots=Array.from({length:3},()=>mkShoot());
  function mkShoot(){return{x:Math.random(),y:Math.random()*.4,len:.07+Math.random()*.09,spd:.0028+Math.random()*.004,ang:Math.PI*.18+Math.random()*.2,life:0,maxLife:70+Math.random()*50,active:false}}
  function drawShoots(){
    shoots.forEach((s,i)=>{
      if(!s.active){if(Math.random()<.002)s.active=true;return}
      s.life++;if(s.life>s.maxLife){shoots[i]=mkShoot();return}
      const prog=s.life/s.maxLife;
      const al=prog<.2?prog/.2:prog>.8?1-(prog-.8)/.2:1;
      const x=s.x*W+Math.cos(s.ang)*s.spd*s.life*W;
      const y=s.y*H+Math.sin(s.ang)*s.spd*s.life*H;
      const x2=x-Math.cos(s.ang)*s.len*W,y2=y-Math.sin(s.ang)*s.len*H;
      const g=ctx.createLinearGradient(x2,y2,x,y);
      g.addColorStop(0,'transparent');g.addColorStop(1,\`rgba(216,180,254,\${al*.75})\`);
      ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x,y);ctx.strokeStyle=g;ctx.lineWidth=1;ctx.stroke();
    });
  }

  function drawHex(){
    const size=W<640?30:45;const rows=Math.ceil(H/size/1.5)+2,cols=Math.ceil(W/size*1.15)+2;
    ctx.strokeStyle=\`rgba(124,58,237,\${.018+Math.sin(t*.3)*.006})\`;ctx.lineWidth=.5;
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
      const x=c*size*1.73+(r%2)*(size*.865),y=r*size*1.5;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;ctx.lineTo(x+size*.9*Math.cos(a),y+size*.9*Math.sin(a))}
      ctx.closePath();ctx.stroke();
    }
  }

  function render(){
    ctx.clearRect(0,0,W,H);
    mx+=(tmx-mx)*.06;my+=(tmy-my)*.06;
    drawOrbs();drawHex();drawStars();drawShoots();drawGrid();
    t+=.016;requestAnimationFrame(render);
  }
  render();
})();

/* ══ PARTICLES ══ */
(function(){
  const wrap=document.getElementById('ptcWrap');
  const cols=['rgba(192,132,252,.7)','rgba(124,58,237,.6)','rgba(245,238,255,.5)','rgba(216,180,254,.65)','rgba(168,85,247,.55)'];
  const n=window.innerWidth<640?10:18;
  for(let i=0;i<n;i++){
    const p=document.createElement('div'),sz=Math.random()*3+.7,c=cols[i%cols.length];
    p.className='ptc';
    p.style.cssText=\`width:\${sz}px;height:\${sz}px;background:\${c};left:\${Math.random()*100}%;animation-duration:\${11+Math.random()*18}s;animation-delay:\${Math.random()*14}s;box-shadow:0 0 \${sz*4}px \${c}\`;
    wrap.appendChild(p);
  }
})();

/* ══ APP STATE ══ */
let API_KEY='',attData=[],attPage=0;const PER_PAGE=20;

/* ══ AUTH ══ */
function doLogin(){
  const key=document.getElementById('keyInput').value.trim();
  if(!key){document.getElementById('keyInput').style.borderColor='rgba(252,165,165,.45)';setTimeout(()=>document.getElementById('keyInput').style.borderColor='',700);return}
  API_KEY=key;
  const btn=document.getElementById('loginBtn');
  btn.innerHTML='<div class="spin" style="width:15px;height:15px;border-width:2px;margin:0 auto"></div>';
  btn.disabled=true;
  fetch('/api/health').then(async()=>{
    const r=await fetch('/api/stats',{headers:{'X-Api-Key':API_KEY}});
    if(r.status===401){document.getElementById('loginErr').style.display='block';API_KEY='';btn.innerHTML='<span style="font-family:\\'Orbitron\\',sans-serif;font-size:12px;letter-spacing:2px">ENTER SYSTEM</span>';btn.disabled=false;return}
    localStorage.setItem('wp_key',API_KEY);hideLogin();
  }).catch(()=>{localStorage.setItem('wp_key',API_KEY);hideLogin();});
}
function hideLogin(){
  const w=document.getElementById('loginWall');
  w.style.transition='opacity .6s,transform .6s';w.style.opacity='0';w.style.transform='scale(1.04)';
  setTimeout(()=>{w.style.display='none';init();},600);
}
function logout(){localStorage.removeItem('wp_key');location.reload()}
document.getElementById('keyInput').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();document.getElementById('loginErr').style.display='none'});

/* ══ INIT ══ */
async function init(){
  const s=localStorage.getItem('wp_key');if(s)API_KEY=s;
  const h=await fetch('/api/health').then(r=>r.json()).catch(()=>({}));
  document.getElementById('botName').textContent=h.bot||'BOT ONLINE';
  const ym=new Date().toISOString().slice(0,7);
  ['lbSeason','attSeason','addSeason'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=ym});
  loadOverview();loadLeaderboard();loadAttendance();loadMvp();
}

async function api(path,opts={}){
  const r=await fetch(path,{...opts,headers:{'X-Api-Key':API_KEY,'Content-Type':'application/json',...(opts.headers||{})}});
  return r.json();
}

function switchTab(id,el){
  document.querySelectorAll('.tab-content').forEach(e=>e.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(e=>e.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');if(el)el.classList.add('active');
}

function animateCount(el,target){
  const dur=1100,start=performance.now();
  const step=now=>{const p=Math.min((now-start)/dur,1),ease=1-Math.pow(1-p,3);el.textContent=Math.round(target*ease);if(p<1)requestAnimationFrame(step)};
  requestAnimationFrame(step);
}

/* ══ OVERVIEW ══ */
async function loadOverview(){
  const d=await api('/api/stats');const db=d.database||{},tm=d.this_month||{},dc=d.discord||{};
  const cards=[
    {c:'c-purple',ico:'📁',lbl:'Records ทั้งหมด',   v:db.total_records   ??0,sub:'ใน database'},
    {c:'c-green', ico:'✅',lbl:'เสร็จสิ้น',         v:db.finished_records??0,sub:'Finished sessions'},
    {c:'c-yellow',ico:'⏳',lbl:'กำลังทำงาน',       v:db.working_records ??0,sub:'Working ค้างอยู่'},
    {c:'c-red',   ico:'⚠', lbl:'ผิดปกติ',          v:db.invalid_records ??0,sub:'Invalid records'},
    {c:'c-pink',  ico:'⏱', lbl:'ชั่วโมงรวมทั้งหมด',v:db.total_hours     ??0,sub:'Total hours'},
    {c:'c-white', ico:'🗓', lbl:'เดือนนี้',         v:tm.records         ??0,sub:\`\${tm.total_hours??0} ชม. รวม\`},
    {c:'c-green', ico:'🟢',lbl:'Online ตอนนี้',      v:dc.online          ??0,sub:\`จาก \${dc.total??0} คน\`},
    {c:'c-yellow',ico:'👑',lbl:'MVP ทั้งหมด',        v:db.mvp_count       ??0,sub:'ผู้รับรางวัล'},
  ];
  document.getElementById('statCards').innerHTML=cards.map((c,i)=>\`
    <div class="stat-card \${c.c}" style="animation-delay:\${i*50}ms">
      <div class="stat-ico">\${c.ico}</div>
      <div class="stat-lbl">\${c.lbl}</div>
      <div class="stat-val" data-v="\${c.v}">0</div>
      <div class="stat-sub">\${c.sub}</div>
    </div>\`).join('');
  document.querySelectorAll('.stat-val[data-v]').forEach(el=>animateCount(el,+el.dataset.v));
}

/* ══ LEADERBOARD ══ */
async function loadLeaderboard(){
  document.getElementById('lbTable').innerHTML='<div class="loading"><div class="spin"></div>LOADING...</div>';
  const d=await api(\`/api/leaderboard?season=\${document.getElementById('lbSeason').value}\`);
  const rows=d.leaderboard||[];const maxM=rows[0]?.total_minutes||1;
  if(!rows.length){document.getElementById('lbTable').innerHTML='<div class="empty"><span class="empty-ico">📭</span>ยังไม่มีข้อมูล</div>';return}
  const rc=i=>i===0?'gold':i===1?'silver':i===2?'bronze':'';
  document.getElementById('lbTable').innerHTML=\`
    <table><thead><tr><th>#</th><th>ผู้ใช้</th><th>User ID</th><th>ชั่วโมง</th><th>นาที</th><th>สัดส่วน</th></tr></thead><tbody>
    \${rows.map((r,i)=>\`<tr>
      <td><span class="rank-n \${rc(i)}">\${i+1}</span></td>
      <td><div class="u-cell"><div class="u-avatar">\${r.user_name.charAt(0).toUpperCase()}</div><span class="u-name">\${r.user_name}</span></div></td>
      <td><span class="u-id">\${r.user_id}</span></td>
      <td><strong style="font-family:Orbitron,sans-serif">\${Math.floor(r.total_minutes/60)}</strong> ชม.</td>
      <td>\${r.total_minutes%60} น.</td>
      <td style="min-width:110px">
        <div style="font-size:10px;color:var(--muted);font-family:Share Tech Mono,monospace;margin-bottom:3px">\${((r.total_minutes/maxM)*100).toFixed(0)}%</div>
        <div class="prog-bar"><div class="prog-fill" style="width:\${(r.total_minutes/maxM)*100}%"></div></div>
      </td>
    </tr>\`).join('')}
    </tbody></table>\`;
}

/* ══ ATTENDANCE ══ */
async function loadAttendance(){
  document.getElementById('attTable').innerHTML='<div class="loading"><div class="spin"></div>LOADING...</div>';
  attPage=0;
  const season=document.getElementById('attSeason').value,status=document.getElementById('attStatus').value;
  let url=\`/api/attendance?limit=200&season=\${season}\`;if(status)url+=\`&status=\${status}\`;
  const d=await api(url);attData=d.data||[];renderAtt();
}
function filterAtt(){attPage=0;renderAtt()}
function renderAtt(){
  const q=document.getElementById('attSearch').value.toLowerCase();
  const filt=attData.filter(r=>!q||r.user_name.toLowerCase().includes(q)||r.user_id.includes(q));
  const total=filt.length,slice=filt.slice(attPage*PER_PAGE,(attPage+1)*PER_PAGE);
  document.getElementById('attPgInfo').textContent=\`\${attPage*PER_PAGE+1}–\${Math.min((attPage+1)*PER_PAGE,total)} / \${total}\`;
  document.getElementById('prevBtn').disabled=attPage===0;
  document.getElementById('nextBtn').disabled=(attPage+1)*PER_PAGE>=total;
  if(!slice.length){document.getElementById('attTable').innerHTML='<div class="empty"><span class="empty-ico">📭</span>ไม่มีข้อมูล</div>';return}
  const fmt=dt=>dt?new Date(dt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false,day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
  const bc=s=>s==='Finished'?'bdg-done':s==='Working'?'bdg-work':'bdg-bad';
  document.getElementById('attTable').innerHTML=\`
    <table><thead><tr><th>ID</th><th>ผู้ใช้</th><th>เข้างาน</th><th>ออกงาน</th><th>รวม</th><th>Status</th><th>หมายเหตุ</th><th></th></tr></thead><tbody>
    \${slice.map(r=>\`<tr>
      <td style="color:var(--muted);font-family:Share Tech Mono,monospace;font-size:10px">\${r.id}</td>
      <td><div class="u-cell"><div class="u-avatar">\${r.user_name.charAt(0).toUpperCase()}</div>
        <div><div class="u-name">\${r.user_name}</div><div class="u-id">\${r.user_id}</div></div></div></td>
      <td style="font-family:Share Tech Mono,monospace;font-size:11px;white-space:nowrap">\${fmt(r.check_in_time)}</td>
      <td style="font-family:Share Tech Mono,monospace;font-size:11px;white-space:nowrap">\${fmt(r.check_out_time)}</td>
      <td><strong style="font-family:Orbitron,sans-serif">\${Math.floor((r.duration_minutes||0)/60)}</strong><span style="color:var(--muted);font-size:11px"> ชม. \${(r.duration_minutes||0)%60} น.</span></td>
      <td><span class="badge \${bc(r.status)}">\${r.status}</span></td>
      <td style="color:var(--muted);font-size:11px;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${r.note||'—'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="openEdit(\${r.id})" style="font-family:Share Tech Mono,monospace;font-size:10px;letter-spacing:.5px">EDIT</button></td>
    </tr>\`).join('')}
    </tbody></table>\`;
}
function changePage(d){
  const q=document.getElementById('attSearch').value.toLowerCase();
  const filt=attData.filter(r=>!q||r.user_name.toLowerCase().includes(q)||r.user_id.includes(q));
  attPage=Math.max(0,Math.min(Math.ceil(filt.length/PER_PAGE)-1,attPage+d));renderAtt();
}

/* ══ MVP ══ */
async function loadMvp(){
  const d=await api('/api/mvp');const rows=d.data||[];
  if(!rows.length){document.getElementById('mvpGrid').innerHTML='<div class="empty"><span class="empty-ico">👑</span>ยังไม่มี MVP</div>';return}
  document.getElementById('mvpGrid').innerHTML=\`<div class="mvp-grid">\${rows.map((m,i)=>\`
    <div class="mvp-card" style="animation-delay:\${i*75}ms">
      <div class="mvp-av">👑</div>
      <div class="mvp-info">
        <h4>\${m.user_name}</h4>
        <div class="u-id" style="margin-bottom:8px">\${m.user_id}</div>
        <div class="mvp-wins">\${m.wins}</div>
        <div class="mvp-wlbl">สมัยที่ได้รับรางวัล</div>
        \${m.last_win?\`<div style="font-size:10px;color:var(--muted);margin-top:5px;font-family:Share Tech Mono,monospace">LAST: \${m.last_win}</div>\`:''}
      </div>
    </div>\`).join('')}
  </div>\`;
}

/* ══ MODALS ══ */
function openEdit(id){
  const r=attData.find(x=>x.id===id);if(!r)return;
  document.getElementById('editId').value=r.id;document.getElementById('editName').value=r.user_name;
  document.getElementById('editIn').value=r.check_in_time?toLocal(r.check_in_time):'';
  document.getElementById('editOut').value=r.check_out_time?toLocal(r.check_out_time):'';
  document.getElementById('editStatus').value=r.status;document.getElementById('editNote').value=r.note||'';
  document.getElementById('editModal').classList.add('open');
}
function openAddModal(){document.getElementById('addModal').classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
function toLocal(dt){const d=new Date(dt),p=n=>String(n).padStart(2,'0');return\`\${d.getFullYear()}-\${p(d.getMonth()+1)}-\${p(d.getDate())}T\${p(d.getHours())}:\${p(d.getMinutes())}\`}

async function saveEdit(){
  const id=document.getElementById('editId').value;
  const body={check_in_time:document.getElementById('editIn').value||null,check_out_time:document.getElementById('editOut').value||null,status:document.getElementById('editStatus').value,note:document.getElementById('editNote').value};
  const r=await api(\`/api/attendance/\${id}\`,{method:'PATCH',body:JSON.stringify(body)});
  if(r.message){toast('✅ บันทึกสำเร็จ','success');closeModal('editModal');loadAttendance()}
  else toast('❌ '+(r.error||'เกิดข้อผิดพลาด'),'error');
}
async function deleteRecord(){
  if(!confirm('⚠ ยืนยันการลบ record นี้?'))return;
  const id=document.getElementById('editId').value;
  const r=await api(\`/api/attendance/\${id}\`,{method:'DELETE'});
  if(r.message){toast('🗑 ลบสำเร็จ','success');closeModal('editModal');loadAttendance()}
  else toast('❌ '+(r.error||'เกิดข้อผิดพลาด'),'error');
}
async function saveAdd(){
  const body={user_id:document.getElementById('addUserId').value,user_name:document.getElementById('addUserName').value,check_in_time:document.getElementById('addIn').value||null,check_out_time:document.getElementById('addOut').value||null,season:document.getElementById('addSeason').value,note:document.getElementById('addNote').value};
  if(!body.user_id||!body.user_name){toast('❌ ต้องใส่ User ID และชื่อ','error');return}
  const r=await api('/api/attendance',{method:'POST',body:JSON.stringify(body)});
  if(r.message){toast('✅ เพิ่มสำเร็จ','success');closeModal('addModal');loadAttendance()}
  else toast('❌ '+(r.error||'เกิดข้อผิดพลาด'),'error');
}

let toastTmr;
function toast(msg,type='success'){
  const el=document.getElementById('toast');el.textContent=msg;el.className='show '+type;
  clearTimeout(toastTmr);toastTmr=setTimeout(()=>{el.className=''},3200);
}

document.querySelectorAll('.modal-bg').forEach(bg=>bg.addEventListener('click',e=>{if(e.target===bg)bg.classList.remove('open')}));
window.addEventListener('load',()=>{const s=localStorage.getItem('wp_key');if(s){API_KEY=s;document.getElementById('loginWall').style.display='none';init()}});
</script>
</body>
</html>`;

// ══════════════════════════════════════════════════════════════════════════════
//  🌐  REST API  —  Routes
// ══════════════════════════════════════════════════════════════════════════════

// GET /  →  serve dashboard
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(DASHBOARD_HTML());
});

// GET /api/health  →  ไม่ต้อง auth
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        bot:    client.user?.username || 'not ready',
        time:   new Date().toISOString(),
    });
});

// GET /api/leaderboard?season=YYYY-MM
app.get('/api/leaderboard', requireAuth, async (req, res) => {
    try {
        const season = req.query.season || moment().tz('Asia/Bangkok').format('YYYY-MM');
        const rows   = await db.all(
            `SELECT user_id, user_name, SUM(duration_minutes) as total_minutes
             FROM attendance
             WHERE status = 'Finished' AND season = ?
             GROUP BY user_id
             ORDER BY total_minutes DESC`,
            [season]
        );

        res.json({
            season,
            count:       rows.length,
            leaderboard: rows.map((r, i) => ({
                rank:          i + 1,
                user_id:       r.user_id,
                user_name:     r.user_name,
                total_minutes: r.total_minutes,
                total_hours:   parseFloat((r.total_minutes / 60).toFixed(2)),
            })),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attendance?season=&user_id=&status=&limit=&offset=
app.get('/api/attendance', requireAuth, async (req, res) => {
    try {
        const limit  = parseInt(req.query.limit)  || 50;
        const offset = parseInt(req.query.offset) || 0;

        let query    = `SELECT * FROM attendance WHERE 1=1`;
        const args   = [];

        if (req.query.season)  { query += ` AND season = ?`;   args.push(req.query.season);  }
        if (req.query.user_id) { query += ` AND user_id = ?`;  args.push(req.query.user_id); }
        if (req.query.status)  { query += ` AND status = ?`;   args.push(req.query.status);  }

        query += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
        args.push(limit, offset);

        const rows = await db.all(query, args);

        // count ต้องใช้ filter เดียวกัน
        let countQuery = `SELECT COUNT(*) as c FROM attendance WHERE 1=1`;
        const countArgs = [];

        if (req.query.season)  { countQuery += ` AND season = ?`;   countArgs.push(req.query.season);  }
        if (req.query.user_id) { countQuery += ` AND user_id = ?`;  countArgs.push(req.query.user_id); }
        if (req.query.status)  { countQuery += ` AND status = ?`;   countArgs.push(req.query.status);  }

        const total = await db.get(countQuery, countArgs);

        res.json({ total: total.c, limit, offset, data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/attendance/:id
app.get('/api/attendance/:id', requireAuth, async (req, res) => {
    try {
        const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ error: 'ไม่พบ record' });
        res.json(row);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/attendance  →  เพิ่ม record manual
app.post('/api/attendance', requireAuth, async (req, res) => {
    try {
        const { user_id, user_name, check_in_time, check_out_time, duration_minutes, season, note } = req.body;
        if (!user_id || !user_name) return res.status(400).json({ error: 'ต้องมี user_id และ user_name' });

        const s = season || moment().tz('Asia/Bangkok').format('YYYY-MM');

        await db.run(
            `INSERT INTO attendance
                (user_id, user_name, check_in_time, check_out_time, duration_minutes, status, season, note)
             VALUES (?, ?, ?, ?, ?, 'Finished', ?, ?)`,
            [user_id, user_name, check_in_time || null, check_out_time || null, duration_minutes || 0, s, note || '']
        );

        res.status(201).json({ message: 'เพิ่ม record สำเร็จ' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/attendance/:id  →  แก้ไข record
app.patch('/api/attendance/:id', requireAuth, async (req, res) => {
    try {
        const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ error: 'ไม่พบ record' });

        const { check_in_time, check_out_time, status, note } = req.body;
        const newIn  = check_in_time  ? moment.tz(check_in_time,  'Asia/Bangkok').format() : row.check_in_time;
        const newOut = check_out_time ? moment.tz(check_out_time, 'Asia/Bangkok').format() : row.check_out_time;
        const nd     = newOut ? Math.round(moment.duration(moment(newOut).diff(moment(newIn))).asMinutes()) : row.duration_minutes;
        const ns     = status || ((nd > 0 && nd <= 1500) ? 'Finished' : row.status);

        await db.run(
            `UPDATE attendance
             SET check_in_time = ?, check_out_time = ?, duration_minutes = ?, status = ?, note = ?
             WHERE id = ?`,
            [newIn, newOut, Math.max(nd, 0), ns, note !== undefined ? note : row.note, req.params.id]
        );

        res.json({
            message: 'อัพเดทสำเร็จ',
            data:    await db.get(`SELECT * FROM attendance WHERE id = ?`, [req.params.id]),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/attendance/:id
app.delete('/api/attendance/:id', requireAuth, async (req, res) => {
    try {
        const row = await db.get(`SELECT * FROM attendance WHERE id = ?`, [req.params.id]);
        if (!row) return res.status(404).json({ error: 'ไม่พบ record' });

        await db.run(`DELETE FROM attendance WHERE id = ?`, [req.params.id]);
        res.json({ message: 'ลบสำเร็จ', deleted: row });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/mvp
app.get('/api/mvp', requireAuth, async (req, res) => {
    try {
        const rows = await db.all(`SELECT * FROM mvp_stats ORDER BY wins DESC`);
        res.json({ count: rows.length, data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/mvp/:user_id  →  แก้ไข MVP wins
app.patch('/api/mvp/:user_id', requireAuth, async (req, res) => {
    try {
        const { wins, user_name, last_win } = req.body;

        await db.run(
            `INSERT INTO mvp_stats (user_id, user_name, wins, last_win)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET
                wins      = COALESCE(?, wins),
                user_name = COALESCE(?, user_name),
                last_win  = COALESCE(?, last_win)`,
            [req.params.user_id, user_name || 'unknown', wins || 0, last_win || '', wins, user_name, last_win]
        );

        res.json({
            message: 'อัพเดทสำเร็จ',
            data:    await db.get(`SELECT * FROM mvp_stats WHERE user_id = ?`, [req.params.user_id]),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/stats  →  Dashboard overview
app.get('/api/stats', requireAuth, async (req, res) => {
    try {
        const season = req.query.season || moment().tz('Asia/Bangkok').format('YYYY-MM');

        const [total, finished, working, invalid, mins, mvpCount, monthRows] = await Promise.all([
            db.get(`SELECT COUNT(*) as c FROM attendance`),
            db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Finished'`),
            db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Working'`),
            db.get(`SELECT COUNT(*) as c FROM attendance WHERE status = 'Invalid'`),
            db.get(`SELECT SUM(duration_minutes) as s FROM attendance WHERE status = 'Finished'`),
            db.get(`SELECT COUNT(*) as c FROM mvp_stats`),
            db.get(
                `SELECT COUNT(*) as c, SUM(duration_minutes) as s
                 FROM attendance WHERE season = ? AND status = 'Finished'`,
                [season]
            ),
        ]);

        res.json({
            season,
            database: {
                total_records:    total.c,
                finished_records: finished.c,
                working_records:  working.c,
                invalid_records:  invalid.c,
                total_minutes:    mins.s || 0,
                total_hours:      parseFloat(((mins.s || 0) / 60).toFixed(2)),
                mvp_count:        mvpCount.c,
            },
            this_month: {
                records:       monthRows.c,
                total_minutes: monthRows.s || 0,
                total_hours:   parseFloat(((monthRows.s || 0) / 60).toFixed(2)),
            },
            discord: getMemberStats(),
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════════════════════
//  🚀  BOOT
// ══════════════════════════════════════════════════════════════════════════════

(async () => {
    await initDB();

    app.listen(API_PORT, () => {
        const cyan  = '\x1b[36m';
        const reset = '\x1b[0m';
        console.log(`${cyan}🌐 REST API พร้อมแล้วที่ http://localhost:${API_PORT}${reset}`);
        console.log(`${cyan}📖 /api/health | /api/leaderboard | /api/attendance | /api/mvp | /api/stats${reset}`);
    });

    // 🔍 ปริ้นท์เช็กค่าที่ Railway อ่านได้ใน Terminal Logs
    console.log('--- CHECK ENVIRONMENT VARIABLES ---');
    console.log('DISCORD_TOKEN จาก Railway คือ:', process.env.DISCORD_TOKEN);
    console.log('------------------------------------');

    client.login(process.env.DISCORD_TOKEN);
})();
