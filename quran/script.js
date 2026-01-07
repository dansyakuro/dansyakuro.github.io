$(document).ready(function(){
	document.body.innerHTML = `
		<nav id="navbar-example2" class="headerku navbar navbar-expand-lg navbar-dark bg-primary pt-1">
			<div class="container-fluid">
				<a class="navbar-brand py-0" href="index.html" onclick="event.preventDefault(); pilihBeranda()">
					<h1 class="me-0 mt-2">Al-Qur'an Indonesia</h1>
				</a>
				<button id="btnNavbar" class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
					<span class="navbar-toggler-icon"></span>
				</button>
				<div class="collapse navbar-collapse justify-content-lg-end" id="navbarNav">
					<div class="d-flex sticky-top pt-3 pt-lg-0">
						<input class="form-control me-2" id="cariTerjemahan" placeholder="Pencarian Ayat">
						<button class="btn btn-outline-dark" onclick="pencarian(document.getElementById('cariTerjemahan').value)">Cari</button>
					</div>
					<ul class="mobile d-block d-lg-none navbar-nav gx-5" id="listSuratMobile"></ul>
				</div>
			</div>
		</nav>
		<div class="wrapper">
			<div class="menuku d-none d-lg-block bg-secondary">
				<nav class="navbar navbar-dark py-0">
					<div class="container-fluid px-0">
						<ul class="navbar-nav w-100" id="listSurat"></ul>
					</div>
				</nav>
			</div>
			<div class="content-scroll bg-light p-3" id="kontenku"></div>
		</div>
	`;

	loadList();

	let el = document.getElementById("cariTerjemahan");
	el.addEventListener("keydown", function(e) {
		if (e.key === "Enter") pencarian(el.value);
	});

	const surat = getSuratFromUrl();
	if(surat){
		pilihSurat(surat);
	}else{
		pilihBeranda();
	}
});

/* =====================
   HELPER URL
===================== */
function getSuratFromUrl(){
	const params = new URLSearchParams(window.location.search);
	return params.get('surat');
}

/* =====================
   LIST SURAT
===================== */
async function loadList(){
	let listSurat = "", listSuratMobile = "", active = "";
	const suratAktif = getSuratFromUrl();

	const json = await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
		.then(res => res.json());

	json.forEach(item => {
		active = (item.nomor == suratAktif) ? "active" : "";
		listSurat += `
			<li class="nav-item">
				<a class="ps-3 py-3 nav-link ${active}"
				   href="?surat=${item.nomor}"
				   onclick="event.preventDefault(); pilihSurat(${item.nomor})">
				   ${item.nomor}. ${item.nama} ( ${item.asma} )
				</a>
			</li>
		`;
		listSuratMobile += `
			<li class="nav-item">
				<a class="dropdown-item ${active}"
				   href="?surat=${item.nomor}"
				   onclick="event.preventDefault(); pilihSurat(${item.nomor})">
				   ${item.nomor}. ${item.nama} ( ${item.asma} )
				</a>
			</li>
		`;
	});

	document.getElementById("listSurat").innerHTML = listSurat;
	document.getElementById("listSuratMobile").innerHTML = listSuratMobile;
}

/* =====================
   PILIH SURAT
===================== */
async function pilihSurat(no){
	history.pushState({}, '', `?surat=${no}`);
	loadList();

	let ayat, bismillah = "";

	document.getElementById("kontenku").innerHTML = `
		<div class="row w-100 m-0">
			<div class="col-12 col-sm-5 col-lg-4">
				<div class="card text-center sticky-sm-top">
					<h4 class="card-header" id="asmaSurat">Asma Surat</h4>
					<div class="card-body">
						<h5 class="card-title" id="artiSurat"></h5>
						<h6 id="tipeSurat"></h6>
						<p class="card-text" id="ketSurat"></p>
					</div>
					<div class="card-footer text-muted">
						<video controls style="width:100%; height:50px" id="audioSurat"></video>
					</div>
				</div>
			</div>
			<div class="col-12 col-sm-7 col-lg-8" id="listAyat"></div>
		</div>
	`;

	const data = await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
		.then(res => res.json());

	document.getElementById("asmaSurat").innerHTML = data[no-1].asma;
	document.getElementById("artiSurat").innerHTML = data[no-1].arti;
	document.getElementById("tipeSurat").innerHTML =
		data[no-1].ayat + ' Ayat Turun di ' + data[no-1].type;
	document.getElementById("ketSurat").innerHTML = data[no-1].keterangan;
	document.getElementById("audioSurat").src = data[no-1].audio.replace("http", "https");

	const ayatJson = await fetch(`https://al-quran-8d642.firebaseio.com/surat/${no}.json?print=pretty`)
		.then(res => res.json());

	ayatJson.forEach(item => {
		if(no > 1 && no != 9 && item.nomor == 1){
			ayat = item.ar.substring(39);
			bismillah = `
				<div class="py-3 border-bottom border-primary">
					<h1 class="text-center">${item.ar.substring(0,39)}</h1>
				</div>
			`;
		}else{
			ayat = item.ar;
			bismillah = "";
		}

		document.getElementById("listAyat").innerHTML += bismillah + `
			<div class="py-3 border-bottom border-primary">
				<h1 class="text-end">${ayat}</h1>
				<h2>Terjemahan :</h2>
				<h2>${item.nomor}. ${item.id}</h2>
			</div>
		`;
	});
}

/* =====================
   BERANDA
===================== */
async function pilihBeranda(){
	history.pushState({}, '', location.pathname);

	document.getElementById("kontenku").innerHTML =
		`<div class="row w-100 m-auto" id="berandaku"></div>`;

	const json = await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
		.then(res => res.json());

	json.forEach(item => {
		document.getElementById("berandaku").innerHTML += `
			<div class="col-4 col-lg-2 d-flex justify-content-center align-items-center my-3 px-1 px-lg-2">
				<a class="btn p-0" href="?surat=${item.nomor}"
				   onclick="event.preventDefault(); pilihSurat(${item.nomor})">
					<div class="card border-primary">
						<div class="card-header">${item.nomor}. ${item.asma}</div>
						<div class="card-body text-primary">
							<h4>${item.nama}</h4>
							<h6>${item.arti}</h6>
							<p>${item.ayat} Ayat Turun di ${item.type}</p>
						</div>
					</div>
				</a>
			</div>
		`;
	});
}

/* =====================
   BACK / FORWARD
===================== */
window.addEventListener('popstate', () => {
	const surat = getSuratFromUrl();
	if(surat) pilihSurat(surat);
	else pilihBeranda();
});
