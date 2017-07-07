
function Scan(def) {

    this.action = def.action;
    this.value = 0;
    this.stateful = true;

}

Scan.prototype.handle = function (frame, wire, msg, source, topic){

        this.value = this.action(this.value, msg, source, topic);
        frame.emit(wire, this.value, source, topic);

};

export default Scan;

// export default Scan;
//
//
// class Scan {
//
//     constructor(def){
//
//         this.action = def.action;
//         this.value = 0;
//         this.stateful = true;
//
//     }
//
//     handle(frame, wire, msg, source, topic){
//
//         const v = this.value = this.action.call(null, this.value, msg);
//         frame.emit(wire, v, source, topic);
//
//     }
//
// }

// export default Scan;


//
// class Scan {
//
//     constructor(func){
//
//         this.hadFirstMsg = false;
//         this.func = func;
//         this.value = null;
//
//     }
//
//     handle(msg, source, topic){
//
//         if(!this.hadFirstMsg){
//             this.hadFirstMsg = true;
//             this.value = msg;
//             return;
//         }
//
//         this.value = this.func(this.value, msg, source, topic);
//
//     }
//
//     next(){
//         return this.value;
//     }
//
//     content(){
//         return this.value;
//     }
//
//     reset(){
//
//     }
// }
//
//
// export default Scan;