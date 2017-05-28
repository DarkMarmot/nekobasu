

class First {

    constructor(){

        this.value = null;
        this.hasValue = false;

    }

    handle(msg){

        if(!this.hasValue) {
            this.value = msg;
            this.hasValue = true;
        }

    }

    reset(){
        this.hasValue = false;
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default First;