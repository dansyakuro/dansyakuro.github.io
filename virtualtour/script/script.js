var container, menuIcon, nav, selection, title, aboutSection, mapSection, supportSection, items, viewer, progressElement, a, xyz;
let [panorama, infospot] = [[],[]];
let [x,y,z] = [[],[],[]];

menuIcon = document.querySelector( '.menu-icon' );
nav = document.querySelector( 'nav' );
selection = document.querySelector( '.item.selected' );
container = document.querySelector( 'section.background' );
title = document.querySelector( 'section.title' );
aboutSection = document.querySelector( 'section.about' );
mapSection = document.querySelector( 'section.map' );
supportSection = document.querySelector( 'section.support' );
items = document.querySelectorAll( '.item' );
viewer = new PANOLENS.Viewer( { container: container } );
viewer.getCamera().fov = 120;
viewer.getCamera().updateProjectionMatrix();
progressElement = document.getElementById( 'progress' );

$(document).ready( async function(){

    await fetch('https://dansyakuro.github.io/virtualtour/script/data.json')
    .then(res =>res.json())
    .then(json => {  
      json.forEach((valueDPI, indexDPI) => {
        panorama[indexDPI] = new PANOLENS.ImagePanorama( valueDPI.image_name ); //variable dari iterasi array dPI
        panorama[indexDPI].addEventListener( 'enter-fade-start', function(){
          [x,y,z] = valueDPI.data[0].location;
          viewer.tweenControlCenter(  new THREE.Vector3( x,y,z ), 0);
        });
        panorama[indexDPI].addEventListener( 'progress', onProgress );
        panorama[indexDPI].addEventListener( 'enter', onEnter );
        panorama[indexDPI].addEventListener("click", function(e){
            if (e.intersects.length > 0) return;
            a = viewer.raycaster.intersectObject(viewer.panorama, true)[0].point;
            xyz = a.x+","+a.y+","+a.z;
            console.log('(x,y,z) = ' + xyz);
          });
        valueDPI.data.forEach((valueData, indexData) => {
          infospot[indexData] = new PANOLENS.Infospot( 600, PANOLENS.DataImage.Arrow );
          [x,y,z] = valueDPI.data[indexData].location; //variable dari iterasi array dPI dan var iterasi count target
          infospot[indexData].position.set( x, y, z );
          infospot[indexData].addHoverText( "Halaman "+valueDPI.data[indexData].page);
          infospot[indexData].addEventListener( 'click', function(){
            viewer.setPanorama( panorama[valueDPI.data[indexData].index] );
            console.log(valueDPI.data[indexData].index);
            document.querySelectorAll( '.panolens-infospot' ).forEach(value => {
              value.style.display = "none";
            });
          } );
          panorama[indexDPI].add( infospot[indexData] );
        });

        viewer.add( panorama[indexDPI] );
    })
  });
});

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
  mapSection.classList.add( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'About' ){

  title.classList.add( 'hide' );
  aboutSection.classList.remove( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'Map' ){

  title.classList.add( 'hide' );
  aboutSection.classList.add( 'hide' );
  mapSection.classList.remove( 'hide' );
  supportSection.classList.add( 'hide' );

} else if ( name === 'Support' ){

  title.classList.add( 'hide' );
  aboutSection.classList.add( 'hide' );
  mapSection.classList.add( 'hide' );
  supportSection.classList.remove( 'hide' );

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
