export type Track={id:string;title:string;artist:string;artistIds:string[];genre:string;bpm:number;date:string;dur:number;a:number;b:number;image?:string;src?:string};
export type Artist={id:string;name:string;genre:string;bio:string;a:number;b:number;featured?:boolean;image?:string};
export type EventItem={id:string;name:string;venue:string;city:string;country:string;date:string;blurb:string;lineup:string[];ticketUrl?:string};
export type Genre={id:string;name:string;a:number;b:number};
export type Article={id:string;kind:string;title:string;excerpt:string;date:string;a:number;b:number};
