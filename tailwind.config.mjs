/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class',
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				brandBlue: '#2B59C3',
				brandDeepBlack: '#0A0A0A',
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				serif: ['Lora', 'serif'],
			},
		},
	},
};