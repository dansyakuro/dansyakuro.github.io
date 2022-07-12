$(document).ready( async function(){
	let listSurat = ""; let listSuratMobile = "";
	await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
	.then(res =>res.json())
	.then(json => {
		json.forEach((item, index) => {
		listSurat += `
		<li class="nav-item">
			<a class="ps-3 py-3 nav-link" href="#" onclick="pilihSurat(`+item.nomor+`)">`+item.nomor+". "+item.nama+" ( "+item.asma+ ` )</a>
		</li>
		`;
		listSuratMobile += `
		<li class="nav-item">
			<a class="dropdown-item" href="#" onclick="pilihSurat(`+item.nomor+`)">`+item.nomor+". "+item.nama+" ( "+item.asma+ ` )</a>
		</li>
		`;
		})
	});
	document.body.innerHTML = `
		<nav id="navbar-example2" class="headerku navbar navbar-expand-lg navbar-dark bg-primary pt-1">
			<div class="container-fluid">
				<a class="navbar-brand py-0" href="#" onclick="pilihBeranda()">
					<h1 class="me-0 mt-2">Al-Qur'an Indonesia</h1>
				</a>
				<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
					<span class="navbar-toggler-icon"></span>
				</button>
				<div class="collapse navbar-collapse justify-content-lg-end" id="navbarNav">
					<form class="d-flex sticky-top pt-3 pt-lg-0">
						<input class="form-control me-2" id="cariTerjemahan" placeholder="Pencarian Ayat" aria-label="Search">
						<button class="btn btn-outline-dark" onclick="pencarian(document.getElementById('cariTerjemahan').value)">Cari</button>
					</form>
					<ul class="mobile d-block d-lg-none navbar-nav gx-5" id="listSuratMobile">`+listSuratMobile+`</ul>
				</div>
			</div>
		</nav>
		<div class="wrapper">
			<div class="menuku d-none d-lg-block bg-secondary">
				<nav id="menuNavbar" class="navbar navbar-dark py-0">
					<div class="container-fluid px-0">
						<ul class="navbar-nav w-100" id="listSurat">`+listSurat+`</ul>
					</div>
				</nav>
			</div>
			<div class="content-scroll bg-light p-3" id="kontenku"></div>
		</div>
	`;
	pilihBeranda();
});

async function pilihSurat(no){
	document.getElementById("kontenku").innerHTML = `
		<div class="row w-100 m-0">
			<div class="col-12 col-sm-5 col-lg-4">
				<div class="card text-center sticky-sm-top">
					<h4 class="card-header" id="asmaSurat">Asma Surat</h4>
					<div class="card-body">
						<h5 class="card-title" id="artiSurat">Pembukaan</h5>
						<h6 id="tipeSurat">7 Ayat Turun di Mekkah</h6>
						<p class="card-text" id="ketSurat">With supporting text below as a natural lead-in to additional content.</p>
					</div>
					<div class="card-footer text-muted">
						<video controls style="width:100%; height:50px" id="audioSurat">
							<source type="audio/mpeg">
							Your browser does not support the audio element.
						</video>
					</div>
				</div>
			</div>	
			<div class="col-12 col-sm-7 col-lg-8" id="listAyat"></div>
		</div>
	`;
	await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
		.then(res=>res.json())
		.then(json=> {
		document.getElementById("asmaSurat").innerHTML= json[no-1].asma;
		document.getElementById("artiSurat").innerHTML= json[no-1].arti;
		document.getElementById("tipeSurat").innerHTML= json[no-1].ayat+` Ayat Turun di `+json[no-1].type;
		document.getElementById("ketSurat").innerHTML= json[no-1].keterangan;
		document.getElementById("audioSurat").src = json[no-1].audio.replace("http", "https");
	});
	await fetch('https://al-quran-8d642.firebaseio.com/surat/'+no+'.json?print=pretty')
		.then(res=>res.json())
		.then(json=> {
		json.forEach((item, index) => {
		document.getElementById("listAyat").innerHTML+= `
			<div class="py-3 border-bottom border-primary">
			<h1 class="text-end">`+item.ar+`</h1>
			<h2>Terjemahan : </h2>
			<h2>`+item.nomor+`. `+item.id+`</h2>
			</div>
		`;
		})
	});
}

async function pilihBeranda(){
	document.getElementById("kontenku").innerHTML = `
		<div class="row w-100 m-auto" id="berandaku"></div>
	`;
	await fetch('https://al-quran-8d642.firebaseio.com/data.json?print=pretty')
	.then(res=>res.json())
	.then(json=> {
		json.forEach((item, index) => {	
			document.getElementById("berandaku").innerHTML += `
			<div class="col-4 col-lg-2 d-flex justify-content-center align-items-center my-3 px-1 px-lg-2">
				<a class="btn p-0" href="#" onclick="pilihSurat(`+item.nomor+`)">
				<div class="card border-primary" style="max-width: 18rem;">
					<div class="card-header" id="asmaSuratCard">`+item.nomor+`. `+item.asma+`</div>
					<div class="card-body text-primary">
						<h4 class="card-title" id="namaSuratCard">`+item.nama+`</h4>
						<h6 id="artiSuratCard">`+item.arti+`</h6>
						<p class="card-text" id="tipeSuratCard">`+item.ayat+` Ayat Turun di `+item.type+`</p>
					</div>
				</div>
				</a>
			</div>
			`;
		});
	});
}

async function pencarian(value){
	let count = 0;
	document.getElementById('cariTerjemahan').value = "";
	document.getElementById("kontenku").innerHTML = `
		<div id="listAyat"></div>
	`;
	for(let i=1; i<=114; i++){
		await fetch('https://al-quran-8d642.firebaseio.com/surat/'+i+'.json?print=pretty')
			.then(res=>res.json())
			.then(json=> {
				json.forEach((item, index) => { 
				if(item.id.search(value) != -1){
					document.getElementById("listAyat").innerHTML+= `
					<div class="py-3 border-bottom border-primary">
						<h4>Nomor Surat : `+i+`</h4>
						<h1 class="text-end">`+item.ar+`</h1>
						<h2>Terjemahan : </h2>
						<h2>`+item.nomor+`. `+item.id.replace(value, "<mark>"+value+"</mark>")+`</h2>
					</div>
				`;
				count++;
				}
			});
		})
	}

	if(count == 0) document.getElementById("listAyat").innerHTML+= `
		<div class="d-flex justify-content-center align-items-center">Terjemahan yang anda cari, tidak ditemukan.</div>
	`;
}
