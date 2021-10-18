import { iBuilding } from "./building";

export interface iPois {
    id: string
    showInMenu: boolean
    names: {translations:{en:string ; fr:string ; es:string}}
    floor: {translations:{en:string ; fr:string ; es:string}}
    node?: any
    descriptions?: {translations:{en:string ; fr:string ; es:string}}
    icon?: {currentSrc?: string}
    groups?: iPois[]
    pois?: iPois[]
    views?: number
    wayfinder: {building: {name: string}}
    firebaseId?: string
}
