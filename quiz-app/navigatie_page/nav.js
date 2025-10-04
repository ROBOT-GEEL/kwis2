
const socket = io(`ws://${window.location.hostname}`);



function driveForward(){
        
        
        
        console.log('driving forward...');
        socket.emit('drive-forward');
        
}

function driveLeft(){
        
        
        
        console.log('driving leftwards...');
        socket.emit('drive-left');
        
}

function driveRight(){
        
        
        
        console.log('driving rightwards...');
        socket.emit('drive-right');
        
}
function driveBackward(){
        
        
        
        console.log('driving backwards...');
        socket.emit('drive-backward');
        
}
function driveStop(){
        
        
        
        console.log('stoooooooooooooooooooooooooop...');
        socket.emit('drive-stop');

}
document.addEventListener('contextmenu', function(event){
        event.preventDefault();
        event.stopPropagation();
});
