const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const BANK_MEGA_HOSTNAME = "https://www.bankmega.com/";
const BANK_MEGA_MAIN_PAGE_ENDPOINT = "promolainnya.php";
const FILE_NAME = "solution.json";

async function scrapeData() {
	var mainPageHtml = await sendGetRequest(
		BANK_MEGA_HOSTNAME + BANK_MEGA_MAIN_PAGE_ENDPOINT
	);
	var promoDivHtml = cheerio("#contentpromolain2", mainPageHtml).html();

	var categories = await getCategories(promoDivHtml);
	let promotionsToSave = {};

	Promise.all(categories.map(getPromosByCategory))
		.then((allPromotions) => {
			allPromotions.map((promotionsByCategory) =>
				Object.assign(promotionsToSave, promotionsByCategory)
			);
			saveToJson(promotionsToSave, FILE_NAME);
		})
		.catch((err) =>
			console.error(
				`Fetching promotions by category failed with message ${err}`
			)
		);
}

function buildUrl(page, subcat) {
	return (
		BANK_MEGA_HOSTNAME +
		BANK_MEGA_MAIN_PAGE_ENDPOINT +
		`?product=0&subcat=${subcat}&page=${page}`
	);
}

async function sendGetRequest(url) {
	return axios
		.get(url)
		.then((response) => {
			if (response && response.status === 200 && response.data) {
				return response.data;
			} else {
				Promise.reject(
					console.error(
						`Request to ${url} returns ${response.status} with message ${response.statusText}`
					)
				);
			}
		})
		.catch((err) =>
			console.error(`Sending request to ${url} failed with message ${err}`)
		);
}

async function getCategories() {
	var categories = [];
	var subCatId = 1;

	console.log("Getting list of categories...");

	do {
		var response = await sendGetRequest(buildUrl("", subCatId));
		var pageContent = await getPromo(response);

		if (pageContent.length === 0) {
			break;
		}

		var title = cheerio("#subcatselected img", response).attr("title");
		var category = {
			id: subCatId,
			title,
		};

		categories.push(category);
		subCatId++;
	} while (pageContent.length > 0);

	return categories;
}

async function getPromo(mainPageResponse) {
	let promos = [];

	cheerio("#promolain.clearfix img", mainPageResponse).map((i, element) => {
		let promo = {};

		if (element) {
			if (element.attribs.title) {
				promo.title = element.attribs.title;
			}
			if (element.attribs.src) {
				promo.logoUrl = element.attribs.src;
			}
			if (element.parent && element.parent.attribs.href) {
				promo.url = element.parent.attribs.href;
			}
		}
		promos.push(promo);
	});

	return promos;
}

async function getPromoDetails(url) {
	return sendGetRequest(url).then((response) => {
		let promoDetails = {};
		var html = cheerio("#contentpromolain2", response).html();
		promoDetails.fullTitle = cheerio(".titleinside h3", html).text();
		promoDetails.area = cheerio(".area b", html).text();
		promoDetails.imgUrl = cheerio(".keteranganinside img", html).attr("src");

		[promoStartDate, promoEndDate] = cheerio(".periode b", html)
			.text()
			.split(" - ");
		if (promoStartDate)
			promoDetails.promoStartDate = toYearMonthDay(promoStartDate);
		if (promoEndDate) promoDetails.promoEndDate = toYearMonthDay(promoEndDate);
		return promoDetails;
	});
}

async function getPromosByPage(mainPageHtml) {
	var promos = await getPromo(mainPageHtml);

	return Promise.all(
		promos.map((promo) => {
			return getPromoDetails(BANK_MEGA_HOSTNAME + promo.url);
		})
	)
		.then((allPromoDetails) => {
			var promosIndex = 0;
			allPromoDetails.map((promoDetails) => {
				Object.assign(promos[promosIndex], promoDetails);
				promosIndex++;
			});
			return promos;
		})
		.catch((err) =>
			console.error(`Fetching promo details failed with message ${err}`)
		);
}

async function getPromosByCategory(category) {
	let promosByCategory = {};
	let promos = [];
	let currentPage = 1;

	console.log(`Scraping promotions for ${category.title} category...`);
	do {
		var response = await sendGetRequest(buildUrl(currentPage, category.id));

		let pageContentHtml = cheerio("#contentpromolain2", response).html();

		var promo = await getPromosByPage(pageContentHtml);

		if (promo.length === 0) break;

		promos = promos.concat(promo);

		currentPage++;
	} while (promo.length > 0);

	promosByCategory[category.title] = promos;

	console.log(`Promo data for ${category.title} category saved`);

	return promosByCategory;
}

function toYearMonthDay(promoPeriod) {
	var months = [
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	];
	let [day, month, year] = promoPeriod.split(" ");
	return {
		year: Number(year),
		month: months.indexOf(month) + 1,
		day: Number(day),
	};
}

async function saveToJson(promotions, fileName) {
	const promotionsJson = JSON.stringify(promotions, null, 2);
	fs.writeFile(fileName, promotionsJson, "utf-8", () => {
		console.log(`Promotions data saved to ${fileName}`);
	});
}

scrapeData();
