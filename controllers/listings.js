const Listing = require("../models/listing");

module.exports.index = async (req, res) => {
  let { search, category } = req.query;
  // console.log(category);

  if (search && search.trim() !== "") {
    searchFilter = {};

    searchFilter = {
      $or: [
        { country: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ],
    };

    const searchListings = await Listing.find(searchFilter);

    if (searchListings.length === 0) {
      return res.render("error.ejs", {
        message: `No listings found for "${search}"`,
      });
    }
    return res.render("listings/search.ejs", { searchListings });
  }

  if (category && category.trim() !== "") {
    const categoryListing = await Listing.find({ category: category });

    if (categoryListing.length === 0) {
      return res.render("error.ejs", {
        message: `No listings found in category "${category}"`,
      });
    }

    return res.render("listings/category.ejs", { categoryListing });
  }

  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  // console.log(listing);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }

  // console.log(listing);
  res.render("listings/show.ejs", {
    listing,
    maptilerKey: process.env.MAP_TOKEN,
  });
};

module.exports.createListing = async (req, res, next) => {
  let url = req.file.path;
  let filename = req.file.filename;

  //Geocode
  const fullAddress = `${req.body.listing.location}, ${req.body.listing.country}`;
  const query = encodeURIComponent(fullAddress);

  // Call MapTiler geocoding API
  const geoUrl = `https://api.maptiler.com/geocoding/${query}.json?limit=1&key=${process.env.MAP_TOKEN}`;
  const geoResponse = await fetch(geoUrl);
  const geoData = await geoResponse.json();
  // console.log(geoData);

  if (!geoData.features || geoData.features.length === 0) {
    req.flash("error", "Location not found, please try again.");
    return res.redirect("/listings/new");
  }

  // Always in [longitude, latitude] order
  const [lng, lat] = geoData.features[0].center;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };

  newListing.geometry = {
    type: "Point",
    coordinates: [lng, lat],
  };

  await newListing.save();
  req.flash("success", "New Listing Created!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  // console.log(listing);
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist!");
    return res.redirect("/listings");
  }
  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  let { id } = req.params;

  // Find the existing listing so we can get old category if needed
  let oldListing = await Listing.findById(id);
  if (!oldListing) {
    req.flash("error", "Listing not found!");
    return res.redirect("/listings");
  }

  // If category is NOT sent from form, keep the old category
  if (!req.body.listing.category) {
    req.body.listing.category = oldListing.category;
  }

  let listing = await Listing.findByIdAndUpdate(
    id,
    { ...req.body.listing },
    { new: true, runValidators: true }
  );
  // console.log("update = ", listing);

  if (typeof req.file !== "undefined") {
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename };
    await listing.save();
  }

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
