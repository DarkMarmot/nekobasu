

class FirstN {

    constructor(n){

        this.value = [];
        this.max = n;

    }

    handle(msg){

        const list = this.value;
        if(list.length < this.max)
            list.push(msg);

    }

    reset(){

        this.hasValue = false;
        this.value = [];

    }

    next(){
        return this.value;
    }

    content(){
        return this.value;
    }

}

export default FirstN;