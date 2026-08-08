# Kebijakan Privasi — Azan Indonesia Reminder

Terakhir diperbarui: 8 Agustus 2026

Bot Telegram **@azan_id_bot** ("Bot") ini menghormati privasi penggunanya. Dokumen ini menjelaskan data apa saja yang dikumpulkan, untuk apa digunakan, dan bagaimana data tersebut disimpan.

## Data yang Dikumpulkan

Saat Anda menggunakan perintah `/pengaturan` dan `/notifikasi`, Bot menyimpan:

- **ID chat Telegram** (`chat_id`) — untuk mengenali dan mengirim pesan ke chat Anda.
- **Nama chat** (`chat_name`) — nama pengguna atau grup, untuk keperluan tampilan/log internal.
- **Lokasi kota** (`city`, `latitude`, `longitude`) — hanya koordinat kota/kabupaten yang Anda pilih dari daftar, bukan lokasi GPS langsung dari perangkat Anda.
- **Preferensi notifikasi** — waktu salat mana (Subuh, Dzuhur, Ashar, Maghrib, Isya) yang Anda aktifkan pengingatnya.
- **Status pengiriman notifikasi harian** — dipakai untuk mencegah pengingat terkirim dua kali di hari yang sama.

Bot tidak membaca, menyimpan, atau memproses isi pesan pribadi Anda selain interaksi dengan perintah dan tombol yang disediakan.

## Penggunaan Data

Data di atas digunakan semata-mata untuk:

1. Menampilkan jadwal salat sesuai lokasi yang Anda pilih (`/jadwal`).
2. Mengirim pengingat azan sesuai preferensi Anda (`/notifikasi`).

## Penyimpanan Data

Data disimpan pada basis data MongoDB milik pengembang dan tidak dijual, dibagikan, atau digunakan untuk iklan pihak ketiga.

## Retensi & Penghapusan

Data akan tetap tersimpan selama Bot digunakan di chat Anda. Untuk meminta penghapusan data, hubungi kontak di bawah.

## Kontak

Pertanyaan atau permintaan terkait privasi dapat disampaikan melalui Telegram: [@ucup_aw](https://t.me/ucup_aw).
