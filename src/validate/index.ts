import {Validator} from "validator.ts/Validator";
import {InternalServerError, BadRequestError} from "restify-errors";
import IReq from "../interfaces/req";
import validators from "./validators";


export default function Valdiate(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>) {
    const validatorName = `${target.constructor.toString().match(/class ([\w|_]+)/)[1]}_${propertyKey}`;
    const ValidationClass = Reflect.get(validators, validatorName);

    const method = descriptor.value;

    descriptor.value = function (...args: Array<any>) {
        const req = args[0];
        const next = args[args.length - 1];

        try {
            const validationRequest = getValidationRequest(ValidationClass, req);
            const validator = new Validator();
            validator.validateOrThrow(validationRequest);
            method.call(this, ...args)
        } catch (e) {
            if (e.name === 'ValidationError') {
                return next(new BadRequestError(e))
            }

            next(new InternalServerError(e))
        }
    }
}

interface Newable {
    new(): any;
}

function getValidationRequest(Klass: Newable, req: IReq) {
    const instance = new Klass();
    if (Reflect.get(req, 'body')) {
        for (let key in req.body) {
            if (Reflect.get(req.body, key)) {
                const val = req.body[key];
                Reflect.set(instance, key, String(val));
            }
        }
    }

    return instance
}