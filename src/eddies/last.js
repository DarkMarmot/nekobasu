

class Last {

    constructor(){

        this.value = null;
        this.hasValue = false;

    }

    handle(msg){

        this.value = msg;
        this.hasValue = true;

    }

    reset(){

        this.value = null;
        this.hasValue = false;

    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}


export default Last;