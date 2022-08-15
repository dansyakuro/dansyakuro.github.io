var container, panorama, menuIcon, nav, selection, title, aboutSection, gallertSection, mapSection, supportSection, items, viewer, progressElement, a, xyz;
let infospot = [];
let [x,y,z] = [[],[],[]];

menuIcon = document.querySelector( '.menu-icon' );
nav = document.querySelector( 'nav' );
selection = document.querySelector( '.item.selected' );
container = document.querySelector( 'section.background' );
title = document.querySelector( 'section.title' );
aboutSection = document.querySelector( 'section.about' );
gallerySection = document.querySelector( 'section.gallery' );
mapSection = document.querySelector( 'section.map' );
supportSection = document.querySelector( 'section.support' );
items = document.querySelectorAll( '.item' );
viewer = new PANOLENS.Viewer( { container: container } );
viewer.getCamera().fov = 100;
viewer.getCamera().updateProjectionMatrix();
progressElement = document.getElementById( 'progress' );

$(document).ready( async function(){

  await fetch('https://dansyakuro.github.io/virtualtour/script/data.json')
    .then(res =>res.json())
    .then(json => {  
        panorama = new PANOLENS.ImagePanorama( json[0].image_name ); //variable dari iterasi array dPI
        panorama.addEventListener( 'enter-fade-start', function(){
          [x,y,z] = json[0].data[0].location;
          viewer.tweenControlCenter(  new THREE.Vector3( x,y,z ), 0);
        });
        panorama.addEventListener( 'progress', onProgress );
        panorama.addEventListener( 'enter', onEnter );
        panorama.addEventListener("click", function(e){
            if (e.intersects.length > 0) return;
            a = viewer.raycaster.intersectObject(viewer.panorama, true)[0].point;
            xyz = a.x+","+a.y+","+a.z;
            console.log('(x,y,z) = ' + xyz);
          });
        json[0].data.forEach((valueData, indexData) => {
          infospot[indexData] = new PANOLENS.Infospot( 600, PANOLENS.DataImage.Arrow );
          [x,y,z] = json[0].data[indexData].location; //variable dari iterasi array dPI dan var iterasi count target
          infospot[indexData].position.set( x, y, z );
          infospot[indexData].addHoverText( "Halaman "+json[0].data[indexData].page);
          infospot[indexData].addEventListener( 'click', function(){
            gantiView(json[0].data[indexData].index);
            console.log(json[0].data[indexData].index);
            document.querySelectorAll( '.panolens-infospot' ).forEach(value => {
              value.style.display = "none";
            });
          } );
          panorama.add( infospot[indexData] );
        });

        viewer.add( panorama );
  });
});

async function gantiView(index){
  await fetch('https://dansyakuro.github.io/virtualtour/script/data.json')
    .then(res =>res.json())
    .then(json => {  
        panorama = new PANOLENS.ImagePanorama( json[index].image_name ); //variable dari iterasi array dPI
        panorama.addEventListener( 'enter-fade-start', function(){
          [x,y,z] = json[index].data[0].location;
          viewer.tweenControlCenter(  new THREE.Vector3( x,y,z ), 0);
        });
        panorama.addEventListener( 'progress', onProgress );
        panorama.addEventListener( 'enter', onEnter );
        panorama.addEventListener("click", function(e){
            if (e.intersects.length > 0) return;
            a = viewer.raycaster.intersectObject(viewer.panorama, true)[0].point;
            xyz = a.x+","+a.y+","+a.z;
            console.log('(x,y,z) = ' + xyz);
          });
        json[index].data.forEach((valueData, indexData) => {
          infospot[indexData] = new PANOLENS.Infospot( 600, PANOLENS.DataImage.Arrow );
          [x,y,z] = json[index].data[indexData].location; //variable dari iterasi array dPI dan var iterasi count target
          infospot[indexData].position.set( x, y, z );
          infospot[indexData].addHoverText( "Halaman "+json[index].data[indexData].page);
          infospot[indexData].addEventListener( 'click', function(){
            gantiView(json[index].data[indexData].index);
            console.log(json[index].data[indexData].index);
            document.querySelectorAll( '.panolens-infospot' ).forEach(value => {
              value.style.display = "none";
            });
          } );
          panorama.add( infospot[indexData] );
        });

        viewer.setPanorama( panorama );
        viewer.add( panorama );
  });
}
function addDomEvents () {

  menuIcon.addEventListener( 'click', function () {
    this.classList.toggle( 'open' );
    nav.classList.toggle( 'open' );
  }, false );

  nav.classList.add( 'animated' );

  // Routing
  for ( var i = 0, hash; i < items.length; i++ ) {

    hash = items[ i ].getAttribute( 'data-hash' );

    if ( hash ) {

      items[ i ].addEventListener( 'click', function () {

        routeTo( this.getAttribute( 'name' ), this );

      }, false );

    }      

    if ( hash === window.location.hash ) {

      routeTo( hash.replace( '#', '' ), items[ i ] );

    }
  }
}

addDomEvents();

function routeTo ( name, element ) {

window.location.hash = '' + name;

if ( name === 'Home' ) {

  title.classList.remove( 'hide' );
  aboutSection.classList.add( 'hide' );
  gallerySection.classList.add( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'About' ){

  title.classList.add( 'hide' );
  aboutSection.classList.remove( 'hide' );
  gallerySection.classList.add( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'Map' ){

  title.classList.add( 'hide' );
  aboutSection.classList.add( 'hide' );
  gallerySection.classList.add( 'hide' );
  mapSection.classList.remove( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'Support' ){

  title.classList.add( 'hide' );
  aboutSection.classList.add( 'hide' );
  gallerySection.classList.add( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.remove( 'hide' );

} else if ( name === 'Gallery' ){

  title.classList.add( 'hide' );
  aboutSection.classList.add( 'hide' );
  gallerySection.classList.remove( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.add( 'hide' );

}

menuIcon.classList.remove( 'open' );
nav.classList.remove( 'open' );

selection.classList.remove( 'selected' );
selection = element;
selection.classList.add( 'selected' );  

}

function onEnter ( event ) {
    progressElement.style.width = 0;
    progressElement.classList.remove( 'finish' );
}

function onProgress ( event ) {
    progress = event.progress.loaded / event.progress.total * 100;
    progressElement.style.width = progress + '%';
    if ( progress === 100 ) {
        progressElement.classList.add( 'finish' );
    }
}
