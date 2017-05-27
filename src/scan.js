
class ScanOperator {

    constructor(func, seed){
        this.func = func;
        this.value = seed;
    }

    handle(msg, source, topic){
        this.value = this.func(this.value, msg, source, topic);
    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

    reset(){

    }
}
