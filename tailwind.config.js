const c=v=>`rgb(var(--${v}) / <alpha-value>)`;
export default {content:['./index.html','./src/**/*.{ts,tsx}'],theme:{extend:{
fontFamily:{display:['Syne','sans-serif'],body:['"Hanken Grotesk"','sans-serif']},
// All colours come from CSS variables in src/index.css (:root = dark, [data-theme=light] = light).
colors:{ink:c('bg'),void:c('surface'),raised:c('raised'),bone:c('fg'),violet:c('accent'),cyan:c('accent2')}}},plugins:[]};
