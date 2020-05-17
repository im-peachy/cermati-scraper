const axios = require("axios");
const cheerio = require("cheerio");

const BANK_MEGA_HOSTNAME = "https://www.bankmega.com/";
const BANK_MEGA_MAIN_PAGE_ENDPOINT = "promolainnya.php";

let allPromotions = {};

async function scrapeData() {
	var mainPageHtml = await sendGetRequest(
		BANK_MEGA_HOSTNAME + BANK_MEGA_MAIN_PAGE_ENDPOINT
	);
	var promoDivHtml = cheerio("#contentpromolain2", mainPageHtml).html();

	var categories = await getCategories(promoDivHtml);
	var promo = await getPromosByCategory(promoDivHtml, "travel");
	// var lastPageNumber = await getLastPageNumber(promoDivHtml);
	// var currentPage = await getCurrentPage(promoDivHtml);
	console.log(categories[0]);
}

async function sendGetRequest(url) {
	let response = await axios.get(url);
	if (response && response.status === 200 && response.data) {
		return response.data;
	} else {
		Promise.reject(
			console.error(
				`Request to ${url} returns ${response.status} with message ${response.statusText}`
			)
		);
	}
}

async function getCategories(mainPageResponse) {
	var categories = [];

	cheerio("#subcatpromo img", mainPageResponse).map((i, el) => {
		let category = {};
		category.title = el.attribs.title;
		category.id = el.attribs.id;
		categories.push(category);
	});

	return categories;
}

async function getPromoDetails(url) {
	return sendGetRequest(url).then((response) => {
		let promoDetails = {};
		var html = cheerio("#contentpromolain2", response).html();
		promoDetails.fullTitle = cheerio(".titleinside h3", html).text();
		promoDetails.area = cheerio(".area b", html).text();
		promoDetails.promoAvailableDate = cheerio(".periode b", html).text();
		return promoDetails;
	});
}

async function getPromo(mainPageResponse, category) {
	let promos = [];

	cheerio("#promolain.clearfix img", mainPageResponse).map((i, element) => {
		let promo = { category };

		if (element) {
			if (element.attribs.title) {
				promo.title = element.attribs.title;
			}
			if (element.attribs.src) {
				promo.imgUrl = element.attribs.src;
			}
			if (element.parent && element.parent.attribs.href) {
				promo.url = element.parent.attribs.href;
			}
		}
		promos.push(promo);
	});

	return promos;
}

async function getPromoWithDetails(mainPageHtml, category) {
	var promos = await getPromo(mainPageHtml, category);
	for (const promo of promos) {
		var details = await getPromoDetails(BANK_MEGA_HOSTNAME + promo.url);
		promo.details = details;
	}
	return promos;
}

function getLastPageNumber(mainPageHtml) {
	return parseInt(
		cheerio("#paging1", mainPageHtml).attr("title").split(" ").pop()
	);
}

function getCurrentPage(mainPageHtml) {
	return parseInt(cheerio("#paging1", mainPageHtml).attr("page"));
}

function getPromosByCategory(mainPageHtml, category) {
	let currentPage = getCurrentPage(mainPageHtml);
	let lastPage = getLastPageNumber(mainPageHtml);
	let promos = { category, promo: {} };

	while (currentPage < lastPage) {
		break;
	}
}

scrapeData();
