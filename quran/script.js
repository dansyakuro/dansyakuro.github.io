const API = "https://equran.id/api/v2";
let audioPlayer = null;
let currentAudioUrl = null;
let currentBtn = null;

$(document).ready(async function () {

	document.body.innerHTML = `
<nav class="navbar navbar-expand-lg navbar-dark bg-primary headerku">
<div class="container-fluid">

<a class="navbar-brand" href="#" onclick="event.preventDefault(); pilihBeranda()">Al-Qur'an Indonesia v2.1</a>

<form class="d-none d-lg-flex ms-auto" onsubmit="event.preventDefault(); cariAyat()">
	<input id="searchDesktop" class="form-control form-control-sm me-2" placeholder="Cari terjemahan...">
	<button class="btn btn-light btn-sm">Cari</button>
</form>

<button class="navbar-toggler ms-2" data-bs-toggle="collapse" data-bs-target="#navMobile">
<span class="navbar-toggler-icon"></span>
</button>

<div class="collapse navbar-collapse" id="navMobile">
<div class="p-3 border-bottom d-lg-none">
	<input id="searchMobile" class="form-control mb-2" placeholder="Cari terjemahan...">
	<button class="btn btn-light w-100" onclick="cariAyat()">Cari</button>
</div>
<ul class="navbar-nav d-lg-none" id="listSuratMobile"></ul>
</div>

</div>
</nav>

<div class="wrapper">
<div class="menuku bg-secondary text-white d-none d-lg-block">
<ul class="navbar-nav" id="listSurat"></ul>
</div>
<div class="content-scroll" id="kontenku"></div>
</div>
`;

	await loadList();

	const params = new URLSearchParams(location.search);
	const surat = params.get("surat");
	const cari = params.get("cari");

	if (cari) {
		$("#searchDesktop, #searchMobile").val(cari);
		cariAyat();
	} else if (surat) {
		pilihSurat(surat);
	} else {
		pilihBeranda();
	}

	$("#loader").remove();
});

/* ===== LIST SURAT ===== */
async function loadList() {
	const res = await fetch(`${API}/surat`);
	const json = await res.json();

	let desktop = "", mobile = "";

	json.data.forEach(s => {
		desktop += `
<li class="nav-item">
<a class="nav-link text-white" href="#" onclick="pilihSurat(${s.nomor})">
${s.nomor}. ${s.namaLatin}
</a></li>`;

		mobile += `
<li class="nav-item">
<a class="nav-link" href="#" onclick="pilihSurat(${s.nomor}); bootstrap.Collapse.getInstance(navMobile).hide()">
${s.nomor}. ${s.namaLatin}
</a></li>`;
	});

	$("#listSurat").html(desktop);
	$("#listSuratMobile").html(mobile);
}

/* ===== PILIH SURAT ===== */
async function pilihSurat(no) {
	stopAudio();
	history.pushState({}, "", `?surat=${no}`);
	$("#kontenku").html("Loading...");

	const res = await fetch(`${API}/surat/${no}`);
	const json = await res.json();
	const s = json.data;

	let html = `
<div class="card sticky-info mb-3">
<div class="card-header d-flex justify-content-between align-items-center">
<b>${s.namaLatin} (${s.arti})</b>
<button class="btn btn-sm btn-outline-secondary"
	onclick="$('#infoSurat').toggle()">
	Detail Surat
</button>
</div>

<div class="card-body info-scroll" id="infoSurat">
<p>${s.deskripsi}</p>

<div class="d-flex gap-2 mb-2">
<button class="btn btn-outline-primary btn-sm" onclick="pilihSurat(${Math.max(1,no-1)})">Prev</button>
<input id="inputSurat" type="number" min="1" max="114" value="${no}"
class="form-control form-control-sm text-center"
onchange="pilihSurat(this.value)">
<button class="btn btn-outline-primary btn-sm" onclick="pilihSurat(${Math.min(114,+no+1)})">Next</button>
</div>

<input id="inputAyat" class="form-control form-control-sm mb-2" placeholder="Ayat ke..." />

<div class="d-flex gap-2">
<button class="btn btn-success btn-sm"
	onclick="toggleAudio('${s.audioFull["01"]}', this)">
	▶️ Putar Surat
</button>
<button class="btn btn-outline-danger btn-sm" onclick="stopAudio()">⏹ Stop</button>
</div>
</div>
</div>
`;

	s.ayat.forEach(a => {
		html += `
<div class="ayat-block" data-ayat="${a.nomorAyat}">
	<div class="ayat">${a.teksArab}</div>

	<div class="terjemahan-label">Terjemahan :</div>
	<div class="terjemahan-text">${a.nomorAyat}. ${a.teksIndonesia}</div>

	<button class="btn btn-sm btn-outline-success mt-2"
		onclick="toggleAudio('${a.audio["01"]}', this)">
		▶️ Putar Ayat
	</button>
</div>`;
	});

	$("#kontenku").html(html);

	$("#inputAyat").on("input", function () {
		const val = parseInt(this.value);
		if (!val) return;

		const target = $(`.ayat-block[data-ayat="${val}"]`);
		if (target.length) {
			$(".content-scroll").animate({
				scrollTop:
					$(".content-scroll").scrollTop() +
					target.position().top - 120
			}, 300);
		}
	});
}

/* ===== BERANDA ===== */
async function pilihBeranda() {
	stopAudio();
	history.pushState({}, "", location.pathname);

	const res = await fetch(`${API}/surat`);
	const json = await res.json();

	let html = `<div class="row">`;

	json.data.forEach(s => {
		html += `
<div class="col-6 col-lg-3 mb-3">
<div class="card surat-card h-100" onclick="pilihSurat(${s.nomor})">
<div class="card-body">
<b>${s.nomor}. ${s.namaLatin}</b>
<p class="mb-1">${s.arti}</p>
<small>${s.jumlahAyat} ayat · ${s.tempatTurun}</small>
</div>
</div>
</div>`;
	});

	html += `</div>`;
	$("#kontenku").html(html);
}

/* ===== SEARCH ===== */
async function cariAyat() {
	stopAudio();

	const isMobileOpen = $("#navMobile").hasClass("show");
	const qRaw = isMobileOpen ? $("#searchMobile").val() : $("#searchDesktop").val();
	if (!qRaw) return;

	const q = qRaw.toLowerCase().trim();
	history.pushState({}, "", `?cari=${qRaw}`);

	const nav = bootstrap.Collapse.getInstance(document.getElementById("navMobile"));
	if (nav) nav.hide();

	$("#kontenku").html("<h5>Mencari ayat...</h5>");

	const res = await fetch(`${API}/surat`);
	const json = await res.json();

	let hasil = "";
	const regex = new RegExp(`(${qRaw})`, "gi");

	for (const s of json.data) {
		const detail = await fetch(`${API}/surat/${s.nomor}`).then(r => r.json());
		detail.data.ayat.forEach(a => {
			if (a.teksIndonesia.toLowerCase().includes(q)) {
				hasil += `
<div class="border-bottom py-3">
<b>Surat ${s.nomor}. ${s.namaLatin} — Ayat ${a.nomorAyat}</b>
<div class="ayat mt-2">${a.teksArab}</div>
<p class="mt-2">
${a.teksIndonesia.replace(regex, `<mark class="bg-warning">$1</mark>`)}
</p>
</div>`;
			}
		});
	}

	$("#kontenku").html(
		hasil || `<div class="alert alert-warning">Pencarian tidak ditemukan</div>`
	);
}

/* ===== AUDIO (PLAY / PAUSE REAL) ===== */
function toggleAudio(url, btn) {
	// audio sama → toggle pause/play
	if (audioPlayer && currentAudioUrl === url) {
		if (audioPlayer.paused) {
			audioPlayer.play();
			btn.innerText = "⏸ Pause";
		} else {
			audioPlayer.pause();
			btn.innerText = "▶️ Putar Ayat";
		}
		return;
	}

	// audio beda → stop lama
	stopAudio();

	audioPlayer = new Audio(url);
	currentAudioUrl = url;
	currentBtn = btn;

	btn.innerText = "⏸ Pause";
	audioPlayer.play();

	audioPlayer.onended = () => {
		btn.innerText = "▶️ Putar Ayat";
		currentAudioUrl = null;
	};
}

function stopAudio() {
	if (audioPlayer) {
		audioPlayer.pause();
		audioPlayer.currentTime = 0;
	}
	if (currentBtn) {
		currentBtn.innerText = "▶️ Putar Ayat";
	}
	audioPlayer = null;
	currentAudioUrl = null;
	currentBtn = null;
}
