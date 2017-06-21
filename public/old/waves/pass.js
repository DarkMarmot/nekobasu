


function Pass() {}

Pass.prototype.handle = function(frame, wire, msg, source, topic){

    frame.emit(wire, msg, source, topic);

};


//
//     // constructor(def){
//     //
//     //     this.action = null;
//     //     this.value = null;
//     //     this.stateful = false;
//     //
//     // }
//
//     handle(frame, wire, msg, source, topic){
//
//         frame.emit(wire, msg, source, topic);
//
//     }
//
// }

export default Pass;
