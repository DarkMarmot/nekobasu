

class Scan {

    constructor(def){

        this.action = def.action;
        this.value = def.seed;
        this.stateful = true;

    }

    handle(frame, wire, msg, source, topic){

        this.value = this.action(this.value, msg, source, topic);
        frame.emit(wire, this.value, source, topic);

    }

}

export default Scan;


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