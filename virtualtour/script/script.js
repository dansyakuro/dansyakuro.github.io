$(document).ready( async function(){

    addDomEvents();

    var container, menuIcon, nav, selection, title, aboutSection, mapSection, supportSection, items, viewer, a, xyz;
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

    await fetch('https://dansyakuro.github.io/virtualtour/data.json')
    .then(res =>res.json())
    .then(json => {  
      json.forEach((valueDPI, indexDPI) => {
        panorama[indexDPI] = new PANOLENS.ImagePanorama( valueDPI.image_name ); //variable dari iterasi array dPI
        panorama[indexDPI].addEventListener( 'enter-fade-start', function(){
          [x,y,z] = valueDPI.data[0].location;
          viewer.tweenControlCenter(  new THREE.Vector3( x,y,z ), 0);
        });
        panorama[indexDPI].addEventListener("click", function(e){
            if (e.intersects.length > 0) return;
            a = viewer.raycaster.intersectObject(viewer.panorama, true)[0].point;
            xyz = a.x+","+a.y+","+a.z;
            console.log('(x,y,z) = ' + xyz);
          });
        valueDPI.data.forEach((valueData, indexData) => {
          infospot[indexData] = new PANOLENS.Infospot( 300, PANOLENS.DataImage.Arrow );
          [x,y,z] = valueDPI.data[indexData].location; //variable dari iterasi array dPI dan var iterasi count target
          infospot[indexData].position.set( x, y, z );
          infospot[indexData].addHoverText( "Halaman "+valueDPI.data[indexData].page);
          infospot[indexData].addEventListener( 'click', function(){
            viewer.setPanorama( panorama[valueDPI.data[indexData].index] );
            console.log(valueDPI.data[indexData].index);
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
